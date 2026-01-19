
import { Component } from './types';

export class ImageProcessor {
  static async process(src: string): Promise<string> {
    const image = await this.loadImage(src);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new 错误('Could not get canvas context');

    canvas.width = image.width;
    canvas.height = image.height;

    // 1. Draw original image
    ctx.drawImage(image, 0, 0);
    const originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // 2. Create binary mask (identify dark lines)
    const binaryMask = this.createMask(originalImageData);
    
    // 3. Find object components and group them
    const objectMask = this.findObjectContours(binaryMask);

    // 4. Flood-fill the exterior from corners to identify background
    this.floodFill(objectMask, 0, 0);
    this.floodFill(objectMask, objectMask.width - 1, 0);
    this.floodFill(objectMask, 0, objectMask.height - 1);
    this.floodFill(objectMask, objectMask.width - 1, objectMask.height - 1);

    // 5. Generate final result
    const resultData = new ImageData(canvas.width, canvas.height);
    const maskDataSource = objectMask.data;

    for (let i = 0; i < maskDataSource.length; i += 4) {
      const r = maskDataSource[i];
      const g = maskDataSource[i + 1];

      // Red (255, 0, 0) was our marker for exterior background
      if (r === 255 && g === 0) {
        this.setPixelData(resultData.data, i, [0, 0, 0, 0]); // Transparent
      } 
      // 0 was our marker for line
      else if (r === 0) {
        this.setPixelData(resultData.data, i, [0, 0, 0, 255]); // Black Line
      } 
      // Otherwise it's white (the interior)
      else {
        this.setPixelData(resultData.data, i, [255, 255, 255, 255]); // White Interior
      }
    }
    
    ctx.putImageData(resultData, 0, 0);
    return canvas.toDataURL('image/png');
  }

  private static loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      img.src = src;
    });
  }

  private static createMask(imageData: ImageData): ImageData {
    const { width, height, data } = imageData;
    const mask = new ImageData(width, height);
    const threshold = 100; // Brightness threshold for sketch lines

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i+1], b = data[i+2];
      const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

      if (luminance < threshold) {
        this.setPixelData(mask.data, i, [0, 0, 0, 255]); // Line (Black)
      } else {
        this.setPixelData(mask.data, i, [255, 255, 255, 255]); // Background Candidate (White)
      }
    }
    return mask;
  }

  private static findObjectContours(imageData: ImageData): ImageData {
    const { width, height, data } = imageData;
    const visited = new Uint8Array(width * height);
    const components: Component[] = [];

    // CCL (Connected Component Labeling)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (data[idx * 4] === 0 && visited[idx] === 0) {
          const pixels: [number, number][] = [];
          const stack: [number, number][] = [[x, y]];
          visited[idx] = 1;
          
          let minX = width, minY = height, maxX = -1, maxY = -1;

          while (stack.length > 0) {
            const [cx, cy] = stack.pop()!;
            pixels.push([cx, cy]);

            if (cx < minX) minX = cx;
            if (cy < minY) minY = cy;
            if (cx > maxX) maxX = cx;
            if (cy > maxY) maxY = cy;

            const neighbors: [number, number][] = [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]];
            for (const [nx, ny] of neighbors) {
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const nIdx = ny * width + nx;
                if (data[nIdx * 4] === 0 && visited[nIdx] === 0) {
                  visited[nIdx] = 1;
                  stack.push([nx, ny]);
                }
              }
            }
          }
          components.push({ pixels, minX, minY, maxX, maxY });
        }
      }
    }

    const newMask = new ImageData(width, height);
    newMask.data.fill(255);

    if (components.length === 0) return newMask;

    // Determine the main object by the largest bounding box
    let mainFrame = components[0];
    let maxArea = -1;
    for (const comp of components) {
      const area = (comp.maxX - comp.minX) * (comp.maxY - comp.minY);
      if (area > maxArea) {
        maxArea = area;
        mainFrame = comp;
      }
    }

    // Include everything within the main frame's bounds
    const objectComponents: Component[] = [mainFrame];
    for (const comp of components) {
      if (comp === mainFrame) continue;
      const centerX = comp.minX + (comp.maxX - comp.minX) / 2;
      const centerY = comp.minY + (comp.maxY - comp.minY) / 2;

      if (
        centerX >= mainFrame.minX && centerX <= mainFrame.maxX &&
        centerY >= mainFrame.minY && centerY <= mainFrame.maxY
      ) {
        objectComponents.push(comp);
      }
    }

    for (const component of objectComponents) {
      for (const [px, py] of component.pixels) {
        const i = (py * width + px) * 4;
        this.setPixelData(newMask.data, i, [0, 0, 0, 255]);
      }
    }

    return newMask;
  }

  private static floodFill(imageData: ImageData, startX: number, startY: number): void {
    const { width, height, data } = imageData;
    const stack: [number, number][] = [[startX, startY]];
    const fillColor = [255, 0, 0, 255]; // Red for exterior marking

    const startIdx = (startY * width + startX) * 4;
    // Don't fill if we hit a line or already filled area
    if (data[startIdx] === 0 || (data[startIdx] === 255 && data[startIdx+1] === 0)) return;

    while (stack.length) {
      const [x, y] = stack.pop()!;
      if (x < 0 || x >= width || y < 0 || y >= height) continue;

      const i = (y * width + x) * 4;
      if (data[i] === 255 && data[i+1] === 255 && data[i+2] === 255) {
        this.setPixelData(data, i, fillColor);
        stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      }
    }
  }

  private static setPixelData(data: Uint8ClampedArray, i: number, color: number[]): void {
    data[i] = color[0];
    data[i + 1] = color[1];
    data[i + 2] = color[2];
    data[i + 3] = color[3];
  }
}
