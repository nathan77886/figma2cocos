import path from 'node:path';

export function assertInsideRoot(root: string, target: string): void {
  const normalizedRoot = path.resolve(root);
  const normalizedTarget = path.resolve(target);
  const relative = path.relative(normalizedRoot, normalizedTarget);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Path escapes project root: ${target}`);
  }
}

export function safeJoin(root: string, relativePath: string): string {
  if (path.isAbsolute(relativePath)) {
    throw new Error(`Path must be relative: ${relativePath}`);
  }
  const joined = path.resolve(root, relativePath);
  assertInsideRoot(root, joined);
  return joined;
}

export function sanitizeFileName(name: string): string {
  const normalized = name
    .trim()
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_');
  return normalized || 'unnamed';
}
