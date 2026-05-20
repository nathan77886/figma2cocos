import { config } from 'dotenv';
import type {
  FigmaGetFileResponse,
  FigmaGetImagesResponse,
  FigmaGetNodeResponse,
  FigmaImageFillsResponse
} from './types.js';

config({ quiet: true });

const API_BASE = 'https://api.figma.com/v1';

export interface GetImagesOptions {
  format?: 'png' | 'jpg' | 'svg';
  scale?: number;
}

export class FigmaClient {
  private readonly token: string;

  constructor(token = process.env.FIGMA_TOKEN) {
    if (!token) {
      throw new Error('FIGMA_TOKEN is missing. Please set it in environment variables.');
    }
    this.token = token;
  }

  private async request<T>(path: string): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: { 'X-Figma-Token': this.token }
    });

    if (!response.ok) {
      const body = await response.text();
      if (response.status === 403) throw new Error('Figma API 403: token has no permission for this file.');
      if (response.status === 404) throw new Error('Figma API 404: file or node not found.');
      if (response.status === 429) throw new Error('Figma API rate limited (429). Please retry later.');
      throw new Error(`Figma API ${response.status}: ${body || 'request failed'}`);
    }

    return (await response.json()) as T;
  }

  async getFile(fileKey: string): Promise<FigmaGetFileResponse> {
    return this.request<FigmaGetFileResponse>(`/files/${fileKey}`);
  }

  async getNode(fileKey: string, nodeId: string): Promise<FigmaGetNodeResponse> {
    const data = await this.request<FigmaGetNodeResponse>(
      `/files/${fileKey}/nodes?ids=${encodeURIComponent(nodeId)}`
    );
    if (!data.nodes?.[nodeId]?.document) {
      throw new Error(`Figma node does not exist: ${nodeId}`);
    }
    return data;
  }

  async getImages(fileKey: string, nodeIds: string[], options: GetImagesOptions = {}): Promise<FigmaGetImagesResponse> {
    const query = new URLSearchParams({
      ids: nodeIds.join(','),
      format: options.format ?? 'png',
      scale: String(options.scale ?? 1)
    });
    const data = await this.request<FigmaGetImagesResponse>(`/images/${fileKey}?${query.toString()}`);
    if (data.err) {
      throw new Error(`Figma image render failed: ${data.err}`);
    }
    return data;
  }

  async getImageFills(fileKey: string): Promise<FigmaImageFillsResponse> {
    return this.request<FigmaImageFillsResponse>(`/files/${fileKey}/images`);
  }

  async downloadBinary(url: string): Promise<Buffer> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download image binary: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
