import { createHash } from 'node:crypto';

export function stableHash(input: string, length = 12): string {
  return createHash('sha1').update(input).digest('hex').slice(0, length);
}

export function stableUuid(input: string): string {
  const hex = createHash('sha1').update(input).digest('hex').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
