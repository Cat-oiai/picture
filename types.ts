
export interface Component {
  pixels: [number, number][];
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface ProcessingState {
  originalSrc: string | null;
  processedSrc: string | null;
  isProcessing: boolean;
  error: string | null;
}
