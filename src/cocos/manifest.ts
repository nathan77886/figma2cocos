import fs from 'node:fs/promises';
import path from 'node:path';
import { stableUuid } from '../utils/hash.js';
import { safeJoin } from '../utils/path.js';

export interface ExportManifestNode {
  name: string;
  assetPath: string;
  textureUuid: string;
  spriteFrameUuid: string;
  lastExportedAt: string;
}

export interface ExportManifest {
  version: 1;
  figmaFiles: Record<string, { nodes: Record<string, ExportManifestNode> }>;
  uuids: Record<string, string>;
}

export const MANIFEST_RELATIVE_PATH = '.figma-cocos/export-manifest.json';

export async function loadManifest(projectRoot: string): Promise<ExportManifest> {
  const target = safeJoin(projectRoot, MANIFEST_RELATIVE_PATH);
  try {
    const data = await fs.readFile(target, 'utf8');
    const parsed = JSON.parse(data) as ExportManifest;
    parsed.uuids ||= {};
    parsed.figmaFiles ||= {};
    return parsed;
  } catch {
    return { version: 1, figmaFiles: {}, uuids: {} };
  }
}

export async function saveManifest(projectRoot: string, manifest: ExportManifest, dryRun = false): Promise<void> {
  if (dryRun) return;
  const target = safeJoin(projectRoot, MANIFEST_RELATIVE_PATH);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

export function getOrCreateUuid(manifest: ExportManifest, key: string): string {
  manifest.uuids[key] ||= stableUuid(key);
  return manifest.uuids[key];
}
