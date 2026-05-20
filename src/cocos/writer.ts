import fs from 'node:fs/promises';
import path from 'node:path';
import { safeJoin } from '../utils/path.js';

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function backupFileIfNeeded(options: {
  projectRoot: string;
  relativePath: string;
  enabled: boolean;
  timestamp: string;
}): Promise<string | undefined> {
  if (!options.enabled) return undefined;
  const source = safeJoin(options.projectRoot, options.relativePath);
  try {
    await fs.access(source);
  } catch {
    return undefined;
  }

  const backupRelative = path.join('.figma-cocos', 'backups', options.timestamp, options.relativePath);
  const backupAbsolute = safeJoin(options.projectRoot, backupRelative);
  await ensureDir(path.dirname(backupAbsolute));
  await fs.copyFile(source, backupAbsolute);
  return backupRelative;
}

export async function writeFileSafe(options: {
  projectRoot: string;
  relativePath: string;
  content: string | Buffer;
  overwrite?: boolean;
  backup?: boolean;
  dryRun?: boolean;
  timestamp?: string;
}): Promise<{ written: boolean; skipped: boolean; path: string; backupPath?: string }> {
  const overwrite = options.overwrite ?? false;
  const backup = options.backup ?? true;
  const dryRun = options.dryRun ?? false;

  const target = safeJoin(options.projectRoot, options.relativePath);

  let exists = false;
  try {
    await fs.access(target);
    exists = true;
  } catch {
    exists = false;
  }

  if (exists && !overwrite) {
    return { written: false, skipped: true, path: options.relativePath };
  }

  let backupPath: string | undefined;
  if (exists && overwrite && backup) {
    backupPath = await backupFileIfNeeded({
      projectRoot: options.projectRoot,
      relativePath: options.relativePath,
      enabled: true,
      timestamp: options.timestamp ?? new Date().toISOString().replace(/[:.]/g, '-')
    });
  }

  if (dryRun) {
    return { written: false, skipped: false, path: options.relativePath, backupPath };
  }

  await ensureDir(path.dirname(target));
  const temp = `${target}.tmp-${Date.now()}`;
  await fs.writeFile(temp, options.content);
  await fs.rename(temp, target);

  return { written: true, skipped: false, path: options.relativePath, backupPath };
}
