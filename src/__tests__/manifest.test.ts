import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { describe, expect, test } from 'vitest';
import { getOrCreateUuid, loadManifest, saveManifest } from '../cocos/manifest.js';

describe('manifest', () => {
  test('create when missing and stable uuid', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'figma-manifest-'));
    const manifest = await loadManifest(dir);
    expect(manifest.version).toBe(1);
    const a = getOrCreateUuid(manifest, 'k1');
    const b = getOrCreateUuid(manifest, 'k1');
    expect(a).toBe(b);
  });

  test('read/write consistency', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'figma-manifest-'));
    const manifest = await loadManifest(dir);
    getOrCreateUuid(manifest, 'k2');
    await saveManifest(dir, manifest);
    const again = await loadManifest(dir);
    expect(again.uuids['k2']).toBe(manifest.uuids['k2']);
  });
});
