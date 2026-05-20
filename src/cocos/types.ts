export interface ExportFilePlanItem {
  type: 'prefab' | 'texture' | 'meta' | 'manifest';
  path: string;
  action: 'create' | 'overwrite' | 'skip';
}

export interface NodeAssetMapItem {
  figmaNodeId: string;
  figmaNodeName: string;
  cocosNodeName: string;
  assetPath?: string;
  uuid?: string;
}

export interface ExportPlan {
  prefabFile: string;
  textureDir: string;
  files: ExportFilePlanItem[];
  nodeAssetMap: NodeAssetMapItem[];
}

export interface ExportSummary {
  nodes: number;
  labels: number;
  sprites: number;
  buttons: number;
  images: number;
}
