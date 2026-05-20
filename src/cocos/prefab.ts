import type { UINode } from '../parser/figma-node.js';
import type { ExportManifest } from './manifest.js';
import { getOrCreateUuid } from './manifest.js';
import { stableUuid } from '../utils/hash.js';

export interface PrefabGenerateOptions {
  fileKey: string;
  cocosVersion?: 'auto' | '3.x' | '2.x';
  texturePathByNodeId?: Record<string, string>;
}

export interface GeneratedPrefab {
  prefab: Record<string, unknown>;
  nodeUuidMap: Record<string, string>;
  componentUuidMap: Record<string, string>;
  spriteFrameRefMap: Record<string, string>;
}

function toLocalPosition(node: UINode, parent?: UINode): { x: number; y: number; z: number } {
  if (!parent) return { x: 0, y: 0, z: 0 };
  const nodeCenterX = node.absoluteX + node.width / 2;
  const nodeCenterY = node.absoluteY + node.height / 2;
  const parentCenterX = parent.absoluteX + parent.width / 2;
  const parentCenterY = parent.absoluteY + parent.height / 2;
  return {
    x: nodeCenterX - parentCenterX,
    y: -(nodeCenterY - parentCenterY),
    z: 0
  };
}

export function generateCocosPrefab(
  ast: UINode,
  manifest: ExportManifest,
  options: PrefabGenerateOptions
): GeneratedPrefab {
  const nodeUuidMap: Record<string, string> = {};
  const componentUuidMap: Record<string, string> = {};
  const spriteFrameRefMap: Record<string, string> = {};

  type NodeData = Record<string, unknown>;
  type ComponentData = Record<string, unknown>;

  const nodes: NodeData[] = [];
  const components: ComponentData[] = [];

  function walk(node: UINode, parent?: UINode): void {
    const nodeUuid = stableUuid(`${options.fileKey}:${node.id}:cc.Node`);
    nodeUuidMap[node.id] = nodeUuid;
    const anchor = node.annotation.anchor ?? [0.5, 0.5];
    const position = toLocalPosition(node, parent);

    nodes.push({
      uuid: nodeUuid,
      name: node.displayName,
      parent: parent ? nodeUuidMap[parent.id] : null,
      children: node.children.map((c) => stableUuid(`${options.fileKey}:${c.id}:cc.Node`)),
      size: { width: node.width, height: node.height },
      anchor: { x: anchor[0], y: anchor[1] },
      position,
      rotation: node.rotation,
      opacity: Math.max(0, Math.min(255, Math.round(node.opacity * 255)))
    });

    const uiTransformUuid = stableUuid(`${options.fileKey}:${node.id}:cc.UITransform`);
    componentUuidMap[`${node.id}:cc.UITransform`] = uiTransformUuid;
    components.push({
      uuid: uiTransformUuid,
      type: 'cc.UITransform',
      node: nodeUuid,
      width: node.width,
      height: node.height
    });

    if (node.cocosType === 'Label') {
      const uuid = stableUuid(`${options.fileKey}:${node.id}:cc.Label`);
      componentUuidMap[`${node.id}:cc.Label`] = uuid;
      components.push({
        uuid,
        type: 'cc.Label',
        node: nodeUuid,
        string: node.text?.characters ?? '',
        fontSize: node.text?.fontSize,
        lineHeight: node.text?.lineHeightPx,
        horizontalAlign: node.annotation.align ?? node.text?.align,
        verticalAlign: node.annotation.valign ?? node.text?.valign,
        overflow: node.annotation.overflow,
        textKey: node.annotation.textKey
      });
    }

    if (node.cocosType === 'Sprite' || node.cocosType === 'Button') {
      const uuid = stableUuid(`${options.fileKey}:${node.id}:cc.Sprite`);
      componentUuidMap[`${node.id}:cc.Sprite`] = uuid;
      const texturePath = options.texturePathByNodeId?.[node.id];
      if (texturePath) {
        const sfKey = `${options.fileKey}:${node.id}:${texturePath}:spriteFrame`;
        spriteFrameRefMap[node.id] = getOrCreateUuid(manifest, sfKey);
      }
      components.push({
        uuid,
        type: 'cc.Sprite',
        node: nodeUuid,
        spriteFrameUuid: spriteFrameRefMap[node.id],
        spriteType: node.annotation.slice ? 'SLICED' : 'SIMPLE'
      });
    }

    if (node.cocosType === 'Button') {
      const uuid = stableUuid(`${options.fileKey}:${node.id}:cc.Button`);
      componentUuidMap[`${node.id}:cc.Button`] = uuid;
      components.push({
        uuid,
        type: 'cc.Button',
        node: nodeUuid,
        target: nodeUuid,
        transition: 'NONE'
      });
    }

    node.children.forEach((child) => walk(child, node));
  }

  walk(ast);

  return {
    prefab: {
      __type__: 'cc.Prefab',
      cocosVersion: options.cocosVersion ?? '3.x',
      root: nodeUuidMap[ast.id],
      nodes,
      components
    },
    nodeUuidMap,
    componentUuidMap,
    spriteFrameRefMap
  };
}
