import { describe, expect, test } from 'vitest';
import { generateCocosPrefab } from '../cocos/prefab.js';
import { stableUuid } from '../utils/hash.js';
import type { UINode } from '../parser/figma-node.js';
import type { ExportManifest } from '../cocos/manifest.js';

function makeNode(partial: Partial<UINode> & { id: string; displayName: string; cocosType: UINode['cocosType'] }): UINode {
  return {
    ...partial,
    id: partial.id,
    name: partial.displayName,
    displayName: partial.displayName,
    figmaType: 'FRAME',
    cocosType: partial.cocosType,
    annotation: { rawName: partial.displayName, displayName: partial.displayName, warnings: [] },
    visible: true,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    absoluteX: 0,
    absoluteY: 0,
    rotation: 0,
    opacity: 1,
    children: partial.children ?? [],
    warnings: partial.warnings ?? []
  };
}

describe('generateCocosPrefab', () => {
  test('structure and stable uuid behavior', () => {
    const label = makeNode({ id: '1:2', displayName: 'Title', cocosType: 'Label', text: { characters: 'Hi' } });
    const sprite = makeNode({ id: '1:3', displayName: 'Bg', cocosType: 'Sprite' });
    const button = makeNode({ id: '1:4', displayName: 'StartButton', cocosType: 'Button' });
    const root = makeNode({ id: '1:1', displayName: 'Root', cocosType: 'Node', children: [label, sprite, button] });

    const manifest: ExportManifest = { version: 1, figmaFiles: {}, uuids: {} };
    const gen = generateCocosPrefab(root, manifest, {
      fileKey: 'fileA',
      texturePathByNodeId: { '1:3': 'assets/textures/bg.png', '1:4': 'assets/textures/btn.png' }
    });

    expect(gen.prefab.root).toBe(gen.nodeUuidMap['1:1']);
    const nodes = gen.prefab.nodes as any[];
    const rootNode = nodes.find((n) => n.uuid === gen.nodeUuidMap['1:1']);
    expect(rootNode.children).toContain(gen.nodeUuidMap['1:2']);

    const components = gen.prefab.components as any[];
    expect(components.some((c) => c.type === 'cc.UITransform')).toBe(true);
    expect(components.some((c) => c.type === 'cc.Label')).toBe(true);
    expect(components.some((c) => c.type === 'cc.Sprite')).toBe(true);
    expect(components.some((c) => c.type === 'cc.Button')).toBe(true);

    expect(gen.spriteFrameRefMap['1:3']).toBe(manifest.uuids['fileA:1:3:assets/textures/bg.png:spriteFrame']);
    expect(stableUuid('x')).toBe(stableUuid('x'));
  });
});
