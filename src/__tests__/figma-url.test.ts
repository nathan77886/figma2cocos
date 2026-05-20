import { describe, expect, test } from 'vitest';
import { parseFigmaUrl } from '../figma/url.js';

describe('parseFigmaUrl', () => {
  test('design URL', () => {
    const r = parseFigmaUrl('https://www.figma.com/design/abc123/name?node-id=1-2');
    expect(r).toEqual({ fileKey: 'abc123', nodeId: '1:2' });
  });

  test('file URL', () => {
    const r = parseFigmaUrl('https://www.figma.com/file/abc123/name?node-id=1-2');
    expect(r).toEqual({ fileKey: 'abc123', nodeId: '1:2' });
  });

  test('node-id 1-2', () => {
    const r = parseFigmaUrl('https://www.figma.com/file/abc123/name?node-id=1-2');
    expect(r.nodeId).toBe('1:2');
  });

  test('node-id 1%3A2', () => {
    const r = parseFigmaUrl('https://www.figma.com/file/abc123/name?node-id=1%3A2');
    expect(r.nodeId).toBe('1:2');
  });

  test('without node-id', () => {
    const r = parseFigmaUrl('https://www.figma.com/file/abc123/name');
    expect(r).toEqual({ fileKey: 'abc123', nodeId: undefined });
  });
});
