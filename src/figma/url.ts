export interface ParsedFigmaUrl {
  fileKey: string;
  nodeId?: string;
}

export function normalizeNodeId(input: string): string {
  return decodeURIComponent(input).replace(/-/g, ':');
}

export function parseFigmaUrl(url: string): ParsedFigmaUrl {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid Figma URL: ${url}`);
  }

  const paths = parsed.pathname.split('/').filter(Boolean);
  if (paths.length < 2 || (paths[0] !== 'design' && paths[0] !== 'file')) {
    throw new Error(`Unsupported Figma URL format: ${url}`);
  }

  const fileKey = paths[1];
  if (!fileKey) {
    throw new Error(`Missing fileKey in Figma URL: ${url}`);
  }

  const nodeId = parsed.searchParams.get('node-id');
  return {
    fileKey,
    nodeId: nodeId ? normalizeNodeId(nodeId) : undefined
  };
}
