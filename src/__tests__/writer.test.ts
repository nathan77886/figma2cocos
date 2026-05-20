import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { describe, expect, test } from 'vitest';
import { safeJoin } from '../utils/path.js';
import { writeFileSafe } from '../cocos/writer.js';

describe('writer and safe path', () => {
  test('safeJoin normal path', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'figma-writer-'));
    const target = safeJoin(dir, 'assets/a.txt');
    expect(target.startsWith(dir)).toBe(true);
  });

  test('safeJoin blocks ../', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'figma-writer-'));
    expect(() => safeJoin(dir, '../x')).toThrow();
  });

  test('safeJoin blocks absolute', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'figma-writer-'));
    expect(() => safeJoin(dir, '/tmp/x')).toThrow();
  });

  test('overwrite false skips', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'figma-writer-'));
    await writeFileSafe({ projectRoot: dir, relativePath: 'a.txt', content: '1' });
    const res = await writeFileSafe({ projectRoot: dir, relativePath: 'a.txt', content: '2', overwrite: false });
    expect(res.skipped).toBe(true);
  });

  test('overwrite + backup creates backup', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'figma-writer-'));
    await writeFileSafe({ projectRoot: dir, relativePath: 'a.txt', content: '1' });
    const res = await writeFileSafe({
      projectRoot: dir,
      relativePath: 'a.txt',
      content: '2',
      overwrite: true,
      backup: true,
      timestamp: '2026'
    });
    expect(res.backupPath).toContain('.figma-cocos/backups/2026/a.txt');
  });

  test('dryRun does not write', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'figma-writer-'));
    await writeFileSafe({ projectRoot: dir, relativePath: 'a.txt', content: '1', dryRun: true });
    await expect(fs.access(path.join(dir, 'a.txt'))).rejects.toBeTruthy();
  });
});
