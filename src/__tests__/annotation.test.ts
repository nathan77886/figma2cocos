import { describe, expect, test } from 'vitest';
import { parseAnnotation } from '../parser/annotation.js';

describe('parseAnnotation', () => {
  test('plain name', () => {
    const r = parseAnnotation('Title');
    expect(r.displayName).toBe('Title');
    expect(r.type).toBeUndefined();
  });

  test('[cc:Button]', () => {
    expect(parseAnnotation('StartButton [cc:Button]').type).toBe('Button');
  });

  test('[cc:type=Sprite;asset=bg]', () => {
    const r = parseAnnotation('Bg [cc:type=Sprite;asset=bg]');
    expect(r.type).toBe('Sprite');
    expect(r.asset).toBe('bg');
  });

  test('[cc:ignore]', () => {
    expect(parseAnnotation('Note [cc:ignore]').ignore).toBe(true);
  });

  test('[cc:flatten;asset=card]', () => {
    const r = parseAnnotation('Card [cc:flatten;asset=card]');
    expect(r.flatten).toBe(true);
    expect(r.asset).toBe('card');
  });

  test('slice', () => {
    expect(parseAnnotation('A [cc:slice=1,2,3,4]').slice).toEqual([1, 2, 3, 4]);
  });

  test('anchor', () => {
    expect(parseAnnotation('A [cc:anchor=0.2,0.3]').anchor).toEqual([0.2, 0.3]);
  });

  test('invalid key warning', () => {
    const r = parseAnnotation('A [cc:foo=bar]');
    expect(r.warnings[0]).toContain('Unknown key');
  });

  test('invalid slice warning', () => {
    const r = parseAnnotation('A [cc:slice=1,2]');
    expect(r.warnings.some((w) => w.includes('Invalid slice'))).toBe(true);
  });
});
