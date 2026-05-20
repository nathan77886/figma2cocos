import { describe, expect, test } from 'vitest';
import { convertFigmaNodeToAst } from '../parser/figma-node.js';
import type { FigmaNode } from '../figma/types.js';

function baseNode(partial: Partial<FigmaNode>): FigmaNode {
  return {
    id: partial.id ?? '1:1',
    name: partial.name ?? 'Root',
    type: partial.type ?? 'FRAME',
    absoluteBoundingBox: partial.absoluteBoundingBox ?? { x: 0, y: 0, width: 100, height: 100 },
    children: partial.children ?? [],
    fills: partial.fills,
    visible: partial.visible,
    layoutMode: partial.layoutMode,
    ...partial
  };
}

describe('convertFigmaNodeToAst', () => {
  test('Text -> Label', () => {
    const ast = convertFigmaNodeToAst(
      baseNode({
        children: [
          baseNode({ id: '1:2', type: 'TEXT', name: 'Title', characters: 'Hello', style: { fontFamily: 'Arial' } })
        ]
      })
    );
    expect(ast.children[0].cocosType).toBe('Label');
  });

  test('Rectangle with image fill -> Sprite', () => {
    const ast = convertFigmaNodeToAst(
      baseNode({
        children: [
          baseNode({ id: '1:2', type: 'RECTANGLE', name: 'Bg', fills: [{ type: 'IMAGE', imageRef: 'img1' }] })
        ]
      })
    );
    expect(ast.children[0].cocosType).toBe('Sprite');
  });

  test('Button name -> Button', () => {
    const ast = convertFigmaNodeToAst(baseNode({ children: [baseNode({ id: '1:2', name: 'StartButton', type: 'FRAME' })] }));
    expect(ast.children[0].cocosType).toBe('Button');
  });

  test('[cc:ignore] skip', () => {
    const ast = convertFigmaNodeToAst(baseNode({ children: [baseNode({ id: '1:2', name: 'Guide [cc:ignore]' })] }));
    expect(ast.children.length).toBe(0);
  });

  test('[cc:flatten] no recursion', () => {
    const ast = convertFigmaNodeToAst(
      baseNode({
        children: [
          baseNode({
            id: '1:2',
            name: 'Card [cc:flatten]',
            children: [baseNode({ id: '1:3', name: 'Inner', type: 'TEXT' })]
          })
        ]
      })
    );
    expect(ast.children[0].children.length).toBe(0);
  });

  test('Instance warning', () => {
    const ast = convertFigmaNodeToAst(baseNode({ children: [baseNode({ id: '1:2', type: 'INSTANCE', name: 'Ins' })] }));
    expect(ast.children[0].warnings.some((w) => w.includes('instance'))).toBe(true);
  });

  test('Auto Layout warning', () => {
    const ast = convertFigmaNodeToAst(baseNode({ children: [baseNode({ id: '1:2', layoutMode: 'VERTICAL', name: 'A' })] }));
    expect(ast.children[0].warnings.some((w) => w.includes('auto layout'))).toBe(true);
  });
});
