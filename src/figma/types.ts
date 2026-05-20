export interface FigmaColor {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface FigmaPaint {
  type: string;
  visible?: boolean;
  color?: FigmaColor;
  imageRef?: string;
}

export interface FigmaBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  visible?: boolean;
  rotation?: number;
  opacity?: number;
  absoluteBoundingBox?: FigmaBoundingBox;
  fills?: FigmaPaint[];
  strokes?: unknown[];
  effects?: unknown[];
  layoutMode?: string;
  characters?: string;
  style?: {
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: number;
    textAlignHorizontal?: string;
    textAlignVertical?: string;
  };
  lineHeightPx?: number;
  children?: FigmaNode[];
}

export interface FigmaGetFileResponse {
  document: FigmaNode;
}

export interface FigmaGetNodeResponse {
  nodes: Record<string, { document?: FigmaNode }>;
}

export interface FigmaGetImagesResponse {
  images: Record<string, string | null>;
  err?: string;
}

export interface FigmaImageFillsResponse {
  meta: {
    images: Record<string, string>;
  };
}
