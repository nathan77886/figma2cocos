import { stableUuid } from '../utils/hash.js';

export interface TextureMetaOptions {
  textureUuid: string;
  spriteFrameUuid: string;
  fileFormatVersion?: string;
  trimType?: string;
  borderTop?: number;
  borderBottom?: number;
  borderLeft?: number;
  borderRight?: number;
}

export function generateTextureMeta(options: TextureMetaOptions): Record<string, unknown> {
  return {
    ver: options.fileFormatVersion ?? '1.0.0',
    importer: 'texture',
    uuid: options.textureUuid,
    files: ['.json', '.png'],
    subMetas: {
      spriteFrame: {
        importer: 'sprite-frame',
        uuid: options.spriteFrameUuid,
        displayName: 'spriteFrame',
        borderTop: options.borderTop ?? 0,
        borderBottom: options.borderBottom ?? 0,
        borderLeft: options.borderLeft ?? 0,
        borderRight: options.borderRight ?? 0,
        trimType: options.trimType ?? 'auto'
      }
    }
  };
}

export function generateSpriteFrameMeta(options: { key: string; slice?: [number, number, number, number] }): {
  textureUuid: string;
  spriteFrameUuid: string;
  meta: Record<string, unknown>;
} {
  const textureUuid = stableUuid(`${options.key}:texture`);
  const spriteFrameUuid = stableUuid(`${options.key}:spriteFrame`);
  const [left, right, top, bottom] = options.slice ?? [0, 0, 0, 0];

  return {
    textureUuid,
    spriteFrameUuid,
    meta: generateTextureMeta({
      textureUuid,
      spriteFrameUuid,
      borderLeft: left,
      borderRight: right,
      borderTop: top,
      borderBottom: bottom
    })
  };
}
