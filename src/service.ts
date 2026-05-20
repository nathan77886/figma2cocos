import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { FigmaClient } from './figma/client.js';
import { parseFigmaUrl } from './figma/url.js';
import type { FigmaNode } from './figma/types.js';
import { parseAnnotation } from './parser/annotation.js';
import { collectExportableImages, convertFigmaNodeToAst, validateAst, type UINode } from './parser/figma-node.js';
import type { ExportPlan } from './cocos/types.js';
import { sanitizeFileName, safeJoin } from './utils/path.js';
import { stableHash } from './utils/hash.js';
import { loadManifest, saveManifest, getOrCreateUuid, MANIFEST_RELATIVE_PATH } from './cocos/manifest.js';
import { generateSpriteFrameMeta } from './cocos/meta.js';
import { generateCocosPrefab } from './cocos/prefab.js';
import { writeFileSafe } from './cocos/writer.js';

const BaseSchema = z
  .object({
    figmaUrl: z.string().optional(),
    fileKey: z.string().optional(),
    nodeId: z.string().optional()
  })
  .refine((v) => Boolean(v.figmaUrl) || (Boolean(v.fileKey) && Boolean(v.nodeId)), {
    message: 'Provide figmaUrl or both fileKey and nodeId'
  });

export const ValidateInputSchema = BaseSchema.extend({
  rules: z.record(z.string(), z.unknown()).optional()
});

export const ExportInputSchema = BaseSchema.extend({
  cocosProjectRoot: z.string(),
  prefabPath: z.string().optional(),
  textureDir: z.string().optional(),
  bundleName: z.string().optional(),
  overwrite: z.boolean().default(false),
  backup: z.boolean().default(true),
  dryRun: z.boolean().default(false),
  validateOnly: z.boolean().default(false),
  scale: z.number().positive().default(1),
  format: z.enum(['png', 'jpg', 'svg']).default('png'),
  cocosVersion: z.enum(['auto', '3.x', '2.x']).default('auto')
});

export type ValidateInput = z.infer<typeof ValidateInputSchema>;
export type ExportInput = z.infer<typeof ExportInputSchema>;

function resolveFigmaRef(input: { figmaUrl?: string; fileKey?: string; nodeId?: string }): {
  fileKey: string;
  nodeId?: string;
} {
  if (input.figmaUrl) {
    return parseFigmaUrl(input.figmaUrl);
  }
  return { fileKey: input.fileKey!, nodeId: input.nodeId };
}

function ensureNodeId(nodeId?: string): string {
  if (!nodeId) {
    throw new Error('Missing nodeId. Please include ?node-id=... in figmaUrl or pass nodeId explicitly.');
  }
  return nodeId;
}

async function loadFigmaNode(input: { figmaUrl?: string; fileKey?: string; nodeId?: string }, client: FigmaClient): Promise<{ fileKey: string; nodeId: string; node: FigmaNode }> {
  const ref = resolveFigmaRef(input);
  const nodeId = ensureNodeId(ref.nodeId);
  const data = await client.getNode(ref.fileKey, nodeId);
  const node = data.nodes[nodeId]?.document;
  if (!node) throw new Error(`Unable to load node ${nodeId}`);
  return { fileKey: ref.fileKey, nodeId, node };
}

function chooseDefaults(ast: UINode, input: Partial<ExportInput>): { prefabPath: string; textureDir: string } {
  const rootName = sanitizeFileName(ast.displayName || 'Root');
  const annotation = ast.annotation;
  const prefabPath = annotation.prefab ?? input.prefabPath ?? `assets/prefabs/figma/${rootName}.prefab`;
  const textureDir = annotation.textureDir ?? input.textureDir ?? `assets/textures/figma/${rootName}`;
  return { prefabPath, textureDir };
}

function ensureRelativePath(field: string, value: string): void {
  if (path.isAbsolute(value)) {
    throw new Error(`${field} must be relative to cocosProjectRoot.`);
  }
}

async function detectCocosVersion(projectRoot: string): Promise<'3.x' | '2.x'> {
  const queue = ['assets'];
  while (queue.length > 0) {
    const next = queue.shift()!;
    const abs = path.resolve(projectRoot, next);
    let entries: Array<{ name: string; isDirectory: () => boolean }> = [];
    try {
      entries = await fs.readdir(abs, { withFileTypes: true }) as any;
    } catch {
      continue;
    }
    for (const entry of entries) {
      const rel = path.join(next, entry.name);
      if (entry.isDirectory()) {
        queue.push(rel);
        continue;
      }
      if (entry.name.endsWith('.meta')) {
        try {
          const content = await fs.readFile(path.resolve(projectRoot, rel), 'utf8');
          if (content.includes('subMetas')) return '3.x';
          if (content.includes('rawTextureUuid')) return '2.x';
        } catch {
          // ignore
        }
      }
    }
  }
  return '3.x';
}

function summarize(ast: UINode, images: number): { nodes: number; labels: number; sprites: number; buttons: number; images: number } {
  let nodes = 0;
  let labels = 0;
  let sprites = 0;
  let buttons = 0;
  function walk(node: UINode): void {
    nodes += 1;
    if (node.cocosType === 'Label') labels += 1;
    if (node.cocosType === 'Sprite') sprites += 1;
    if (node.cocosType === 'Button') buttons += 1;
    node.children.forEach(walk);
  }
  walk(ast);
  return { nodes, labels, sprites, buttons, images };
}

function flattenTree(ast: UINode): Array<{ id: string; name: string; displayName: string; figmaType: string; annotation: object; warnings: string[]; children: any[] }> {
  return [
    {
      id: ast.id,
      name: ast.name,
      displayName: ast.displayName,
      figmaType: ast.figmaType,
      annotation: ast.annotation,
      warnings: ast.warnings,
      children: ast.children.flatMap((c) => flattenTree(c))
    }
  ];
}

export async function validateFigmaCocosDesign(input: ValidateInput): Promise<{
  ok: boolean;
  errors: string[];
  warnings: string[];
  detectedNodes: Array<{
    figmaNodeId: string;
    name: string;
    displayName: string;
    figmaType: string;
    cocosType: string;
    annotation: object;
  }>;
  exportPlan: object;
}> {
  const parsed = ValidateInputSchema.parse(input);
  const client = new FigmaClient();
  const figma = await loadFigmaNode(parsed, client);
  const ast = convertFigmaNodeToAst(figma.node);
  const check = validateAst(ast);

  const detectedNodes: Array<{
    figmaNodeId: string;
    name: string;
    displayName: string;
    figmaType: string;
    cocosType: string;
    annotation: object;
  }> = [];

  function walk(node: UINode): void {
    detectedNodes.push({
      figmaNodeId: node.id,
      name: node.name,
      displayName: node.displayName,
      figmaType: node.figmaType,
      cocosType: node.cocosType,
      annotation: node.annotation
    });
    node.children.forEach(walk);
  }
  walk(ast);

  const defaults = chooseDefaults(ast, {});

  return {
    ok: check.errors.length === 0,
    errors: check.errors,
    warnings: check.warnings,
    detectedNodes,
    exportPlan: {
      prefabPath: defaults.prefabPath,
      textureDir: defaults.textureDir,
      imageCount: collectExportableImages(ast).length
    }
  };
}

export async function inspectFigmaCocosAnnotations(input: {
  figmaUrl?: string;
  fileKey?: string;
  nodeId?: string;
}): Promise<{
  ok: boolean;
  tree: any[];
  invalidAnnotations: Array<{ nodeId: string; name: string; reason: string }>;
}> {
  const parsed = BaseSchema.parse(input);
  const client = new FigmaClient();
  const figma = await loadFigmaNode(parsed, client);

  const invalidAnnotations: Array<{ nodeId: string; name: string; reason: string }> = [];

  function walkRaw(node: FigmaNode): void {
    const ann = parseAnnotation(node.name);
    ann.warnings.forEach((w) => invalidAnnotations.push({ nodeId: node.id, name: node.name, reason: w }));
    (node.children ?? []).forEach(walkRaw);
  }

  walkRaw(figma.node);
  const ast = convertFigmaNodeToAst(figma.node);

  return {
    ok: true,
    tree: flattenTree(ast),
    invalidAnnotations
  };
}

async function buildExportPlan(ast: UINode, input: ExportInput): Promise<ExportPlan> {
  const defaults = chooseDefaults(ast, input);
  ensureRelativePath('prefabPath', defaults.prefabPath);
  ensureRelativePath('textureDir', defaults.textureDir);

  const files: ExportPlan['files'] = [];
  const nodeAssetMap: ExportPlan['nodeAssetMap'] = [];

  const imageNodes = collectExportableImages(ast);
  for (const item of imageNodes) {
    const node = item.nodeName;
    const extension = input.format;
    const fileBase = sanitizeFileName(node) + '-' + stableHash(item.nodeId, 6);
    const texturePath = path.posix.join(defaults.textureDir.replace(/\\/g, '/'), `${fileBase}.${extension}`);
    const metaPath = `${texturePath}.meta`;

    files.push({ type: 'texture', path: texturePath, action: 'create' });
    files.push({ type: 'meta', path: metaPath, action: 'create' });
    nodeAssetMap.push({
      figmaNodeId: item.nodeId,
      figmaNodeName: item.nodeName,
      cocosNodeName: item.nodeName,
      assetPath: texturePath
    });
  }

  files.push({ type: 'prefab', path: defaults.prefabPath, action: 'create' });
  files.push({ type: 'manifest', path: MANIFEST_RELATIVE_PATH, action: 'create' });

  for (const file of files) {
    try {
      await fs.access(safeJoin(input.cocosProjectRoot, file.path));
      file.action = input.overwrite ? 'overwrite' : 'skip';
    } catch {
      file.action = 'create';
    }
  }

  return {
    prefabFile: defaults.prefabPath,
    textureDir: defaults.textureDir,
    files,
    nodeAssetMap
  };
}

export async function generateCocosExportPlan(input: ExportInput): Promise<{
  ok: boolean;
  prefabFile: string;
  textureDir: string;
  files: ExportPlan['files'];
  nodeAssetMap: ExportPlan['nodeAssetMap'];
  warnings: string[];
  errors: string[];
}> {
  const parsed = ExportInputSchema.parse(input);
  const client = new FigmaClient();
  const figma = await loadFigmaNode(parsed, client);
  const ast = convertFigmaNodeToAst(figma.node);
  const check = validateAst(ast);
  const plan = await buildExportPlan(ast, parsed);

  return {
    ok: check.errors.length === 0,
    prefabFile: plan.prefabFile,
    textureDir: plan.textureDir,
    files: plan.files,
    nodeAssetMap: plan.nodeAssetMap,
    warnings: check.warnings,
    errors: check.errors
  };
}

export async function exportFigmaToCocosPrefab(input: ExportInput): Promise<{
  ok: boolean;
  prefabFile?: string;
  writtenAssets: string[];
  skippedAssets: string[];
  warnings: string[];
  errors: string[];
  summary: { nodes: number; labels: number; sprites: number; buttons: number; images: number };
}> {
  const parsed = ExportInputSchema.parse(input);
  const client = new FigmaClient();
  const figma = await loadFigmaNode(parsed, client);
  const ast = convertFigmaNodeToAst(figma.node);
  const check = validateAst(ast);

  const version = parsed.cocosVersion === 'auto' ? await detectCocosVersion(parsed.cocosProjectRoot) : parsed.cocosVersion;
  const plan = await buildExportPlan(ast, parsed);

  if (parsed.validateOnly || parsed.dryRun || check.errors.length > 0) {
    return {
      ok: check.errors.length === 0,
      prefabFile: plan.prefabFile,
      writtenAssets: [],
      skippedAssets: plan.files.filter((f) => f.action === 'skip').map((f) => f.path),
      warnings: check.warnings,
      errors: check.errors,
      summary: summarize(ast, collectExportableImages(ast).length)
    };
  }

  const manifest = await loadManifest(parsed.cocosProjectRoot);
  const imageFills = await client.getImageFills(figma.fileKey);

  const writtenAssets: string[] = [];
  const skippedAssets: string[] = [];
  const texturePathByNodeId: Record<string, string> = {};

  const nodeAssets = new Map(plan.nodeAssetMap.map((n) => [n.figmaNodeId, n]));
  const exportable = collectExportableImages(ast);

  for (const item of exportable) {
    const mapped = nodeAssets.get(item.nodeId);
    if (!mapped?.assetPath) continue;
    texturePathByNodeId[item.nodeId] = mapped.assetPath;

    let binary: Buffer;
    if (item.mode === 'image-fill' && item.imageRef) {
      const imgUrl = imageFills.meta.images[item.imageRef];
      if (!imgUrl) {
        throw new Error(`Image fill URL missing for imageRef: ${item.imageRef}`);
      }
      binary = await client.downloadBinary(imgUrl);
    } else {
      const image = await client.getImages(figma.fileKey, [item.nodeId], { format: parsed.format, scale: parsed.scale });
      const url = image.images[item.nodeId];
      if (!url) throw new Error(`Render image URL missing for node: ${item.nodeId}`);
      binary = await client.downloadBinary(url);
    }

    const key = `${figma.fileKey}:${item.nodeId}:${mapped.assetPath}`;
    const { textureUuid, spriteFrameUuid, meta } = generateSpriteFrameMeta({ key });
    mapped.uuid = spriteFrameUuid;

    manifest.figmaFiles[figma.fileKey] ||= { nodes: {} };
    manifest.figmaFiles[figma.fileKey].nodes[item.nodeId] = {
      name: item.nodeName,
      assetPath: mapped.assetPath,
      textureUuid,
      spriteFrameUuid,
      lastExportedAt: new Date().toISOString()
    };
    getOrCreateUuid(manifest, `${key}:texture`);
    getOrCreateUuid(manifest, `${key}:spriteFrame`);

    const textureWrite = await writeFileSafe({
      projectRoot: parsed.cocosProjectRoot,
      relativePath: mapped.assetPath,
      content: binary,
      overwrite: parsed.overwrite,
      backup: parsed.backup,
      dryRun: parsed.dryRun
    });
    if (textureWrite.written) writtenAssets.push(textureWrite.path);
    if (textureWrite.skipped) skippedAssets.push(textureWrite.path);

    const metaWrite = await writeFileSafe({
      projectRoot: parsed.cocosProjectRoot,
      relativePath: `${mapped.assetPath}.meta`,
      content: `${JSON.stringify(meta, null, 2)}\n`,
      overwrite: parsed.overwrite,
      backup: parsed.backup,
      dryRun: parsed.dryRun
    });
    if (metaWrite.written) writtenAssets.push(metaWrite.path);
    if (metaWrite.skipped) skippedAssets.push(metaWrite.path);
  }

  const prefab = generateCocosPrefab(ast, manifest, {
    fileKey: figma.fileKey,
    cocosVersion: version,
    texturePathByNodeId
  });

  const prefabWrite = await writeFileSafe({
    projectRoot: parsed.cocosProjectRoot,
    relativePath: plan.prefabFile,
    content: `${JSON.stringify(prefab.prefab, null, 2)}\n`,
    overwrite: parsed.overwrite,
    backup: parsed.backup,
    dryRun: parsed.dryRun
  });

  if (prefabWrite.written) writtenAssets.push(prefabWrite.path);
  if (prefabWrite.skipped) skippedAssets.push(prefabWrite.path);

  await saveManifest(parsed.cocosProjectRoot, manifest, parsed.dryRun);
  if (!parsed.dryRun) writtenAssets.push(MANIFEST_RELATIVE_PATH);

  return {
    ok: true,
    prefabFile: plan.prefabFile,
    writtenAssets,
    skippedAssets,
    warnings: check.warnings,
    errors: [],
    summary: summarize(ast, exportable.length)
  };
}
