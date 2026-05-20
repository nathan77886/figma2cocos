import type { FigmaNode } from '../figma/types.js';
import { parseAnnotation, type CocosAnnotation } from './annotation.js';

export interface UINode {
  id: string;
  name: string;
  displayName: string;
  figmaType: string;
  cocosType: 'Node' | 'Sprite' | 'Label' | 'Button';
  annotation: CocosAnnotation;
  visible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  absoluteX: number;
  absoluteY: number;
  rotation: number;
  opacity: number;
  fills?: any[];
  strokes?: any[];
  effects?: any[];
  text?: {
    characters: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: number;
    lineHeightPx?: number;
    color?: string;
    align?: string;
    valign?: string;
  };
  imageRef?: string;
  children: UINode[];
  warnings: string[];
}

export interface ExportableImage {
  nodeId: string;
  nodeName: string;
  mode: 'image-fill' | 'render';
  imageRef?: string;
}

export function resolveCocosType(node: FigmaNode, annotation: CocosAnnotation, warnings: string[]): UINode['cocosType'] {
  if (annotation.type === 'Label') return 'Label';
  if (annotation.type === 'Sprite') return 'Sprite';
  if (annotation.type === 'Button') return 'Button';
  if (/btn|button/i.test(annotation.displayName)) return 'Button';
  if (node.type === 'TEXT') return 'Label';
  if (node.type === 'INSTANCE') {
    warnings.push('instance treated as container');
    return 'Node';
  }
  const fills = node.fills ?? [];
  const hasImageFill = fills.some((f: any) => f?.type === 'IMAGE' && f.imageRef);
  const hasSolidFill = fills.some((f: any) => f?.type === 'SOLID');
  if (['RECTANGLE', 'ELLIPSE', 'VECTOR'].includes(node.type) && (hasImageFill || hasSolidFill)) return 'Sprite';
  return 'Node';
}

export function convertFigmaNodeToAst(figmaNode: FigmaNode, options?: { includeHidden?: boolean }): UINode {
  const includeHidden = options?.includeHidden ?? false;

  function walk(node: FigmaNode): UINode | null {
    const annotation = parseAnnotation(node.name);
    const warnings = [...annotation.warnings];

    if (annotation.ignore) return null;
    if (node.visible === false && !includeHidden) return null;
    if (node.layoutMode && node.layoutMode !== 'NONE') warnings.push('auto layout is not restored in v1');
    if ((node.effects?.length ?? 0) > 0) warnings.push('effects are not restored in v1');

    const bbox = node.absoluteBoundingBox ?? { x: 0, y: 0, width: 0, height: 0 };
    const imageFill = (node.fills ?? []).find((f: any) => f?.type === 'IMAGE' && f.imageRef) as
      | { imageRef?: string }
      | undefined;

    const current: UINode = {
      id: node.id,
      name: node.name,
      displayName: annotation.displayName,
      figmaType: node.type,
      cocosType: resolveCocosType(node, annotation, warnings),
      annotation,
      visible: node.visible !== false,
      x: bbox.x,
      y: bbox.y,
      width: bbox.width,
      height: bbox.height,
      absoluteX: bbox.x,
      absoluteY: bbox.y,
      rotation: node.rotation ?? 0,
      opacity: node.opacity ?? 1,
      fills: node.fills,
      strokes: node.strokes,
      effects: node.effects,
      imageRef: imageFill?.imageRef,
      text:
        node.type === 'TEXT'
          ? {
              characters: node.characters ?? '',
              fontSize: node.style?.fontSize,
              fontFamily: node.style?.fontFamily,
              fontWeight: node.style?.fontWeight,
              lineHeightPx: node.lineHeightPx,
              align: node.style?.textAlignHorizontal,
              valign: node.style?.textAlignVertical
            }
          : undefined,
      children: [],
      warnings
    };

    if (!annotation.flatten) {
      for (const child of node.children ?? []) {
        const next = walk(child);
        if (next) current.children.push(next);
      }
    }

    return current;
  }

  const root = walk(figmaNode);
  if (!root) {
    throw new Error('Root node is ignored or hidden. Nothing to export.');
  }
  return root;
}

export function collectExportableImages(ast: UINode): ExportableImage[] {
  const images: ExportableImage[] = [];

  function walk(node: UINode): void {
    if (node.annotation.flatten || node.annotation.export) {
      images.push({ nodeId: node.id, nodeName: node.displayName, mode: 'render' });
    } else if (node.imageRef) {
      images.push({ nodeId: node.id, nodeName: node.displayName, mode: 'image-fill', imageRef: node.imageRef });
    }
    node.children.forEach(walk);
  }

  walk(ast);
  return images;
}

export function validateAst(ast: UINode): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const assetKeys = new Set<string>();

  function walk(node: UINode): void {
    if (node.width < 0 || node.height < 0) {
      errors.push(`Node ${node.displayName} has negative size.`);
    }

    if (node.figmaType === 'TEXT' && !node.text?.fontFamily) {
      warnings.push(`Text node ${node.displayName} has no font information.`);
    }

    if (node.annotation.asset) {
      if (assetKeys.has(node.annotation.asset)) {
        errors.push(`Duplicate asset name detected: ${node.annotation.asset}`);
      }
      assetKeys.add(node.annotation.asset);
    }

    warnings.push(...node.warnings);
    node.children.forEach(walk);
  }

  if (!ast) {
    errors.push('Missing root node.');
    return { errors, warnings };
  }

  if (!ast.annotation.prefab) {
    warnings.push('Root node has no prefab annotation, default path will be used.');
  }

  walk(ast);
  return { errors, warnings };
}
