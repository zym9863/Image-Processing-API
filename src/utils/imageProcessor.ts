export interface ImageProcessingOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  blur?: number;
  sharpen?: boolean;
  grayscale?: boolean;
  rotate?: number;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  crop?: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
}

export interface ImageInfo {
  width: number;
  height: number;
  format: string;
  size: number;
  channels: number;
  hasAlpha: boolean;
}

export class ImageProcessor {
  private imageData: Uint8Array;
  private canvas: OffscreenCanvas | null = null;
  private ctx: OffscreenCanvasRenderingContext2D | null = null;
  private originalWidth: number = 0;
  private originalHeight: number = 0;

  constructor(imageData: Uint8Array) {
    this.imageData = imageData;
  }

  /**
   * 初始化canvas和图片
   */
  private async initialize(): Promise<void> {
    if (this.canvas) return;

    // Try to get basic image information without using Canvas API
    // This is a fallback for environments where Canvas API is not available
    try {
      if (typeof createImageBitmap !== 'undefined' && typeof OffscreenCanvas !== 'undefined') {
        // Browser environment
        const blob = new Blob([this.imageData]);
        const imageBitmap = await createImageBitmap(blob);
        
        this.originalWidth = imageBitmap.width;
        this.originalHeight = imageBitmap.height;
        
        this.canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
        this.ctx = this.canvas.getContext('2d');
        
        if (!this.ctx) {
          throw new Error('Failed to get 2D rendering context');
        }
        
        this.ctx.drawImage(imageBitmap, 0, 0);
      } else {
        // Serverless environment - extract basic info from image headers
        const info = this.extractImageInfo();
        this.originalWidth = info.width;
        this.originalHeight = info.height;
      }
    } catch (error) {
      // Fallback: try to extract basic info from image headers
      const info = this.extractImageInfo();
      this.originalWidth = info.width;
      this.originalHeight = info.height;
    }
  }

  /**
   * 获取图片信息
   */
  async getInfo(): Promise<ImageInfo> {
    await this.initialize();
    
    const format = this.detectFormat();
    
    return {
      width: this.originalWidth,
      height: this.originalHeight,
      format,
      size: this.imageData.length,
      channels: 4, // RGBA
      hasAlpha: true
    };
  }

  /**
   * 检测图片格式
   */
  private detectFormat(): string {
    const signatures = [
      { format: 'jpeg', signature: [0xFF, 0xD8, 0xFF] },
      { format: 'png', signature: [0x89, 0x50, 0x4E, 0x47] },
      { format: 'gif', signature: [0x47, 0x49, 0x46] },
      { format: 'webp', signature: [0x52, 0x49, 0x46, 0x46] },
      { format: 'bmp', signature: [0x42, 0x4D] }
    ];

    for (const { format, signature } of signatures) {
      if (signature.every((byte, index) => this.imageData[index] === byte)) {
        return format;
      }
    }

    return 'unknown';
  }

  /**
   * 调整图片大小
   */
  async resize(width?: number, height?: number, fit: 'cover' | 'contain' | 'fill' | 'inside' | 'outside' = 'cover'): Promise<ImageProcessor> {
    await this.initialize();
    
    if (!this.canvas || !this.ctx) {
      console.warn('Canvas not available, skipping resize operation');
      return this;
    }

    const currentWidth = this.canvas.width;
    const currentHeight = this.canvas.height;

    // Calculate new dimensions
    let newWidth = width || currentWidth;
    let newHeight = height || currentHeight;

    if (width && height) {
      const aspectRatio = currentWidth / currentHeight;
      const targetAspectRatio = width / height;

      switch (fit) {
        case 'cover':
          if (aspectRatio > targetAspectRatio) {
            newWidth = height * aspectRatio;
          } else {
            newHeight = width / aspectRatio;
          }
          break;
        case 'contain':
          if (aspectRatio > targetAspectRatio) {
            newHeight = width / aspectRatio;
          } else {
            newWidth = height * aspectRatio;
          }
          break;
        case 'fill':
          newWidth = width;
          newHeight = height;
          break;
      }
    } else if (width) {
      newHeight = (width / currentWidth) * currentHeight;
    } else if (height) {
      newWidth = (height / currentHeight) * currentWidth;
    }

    // Create new canvas with new dimensions
    const newCanvas = new OffscreenCanvas(newWidth, newHeight);
    const newCtx = newCanvas.getContext('2d');
    
    if (!newCtx) {
      throw new Error('Failed to get 2D rendering context for new canvas');
    }

    // Draw resized image
    newCtx.drawImage(this.canvas, 0, 0, newWidth, newHeight);
    
    this.canvas = newCanvas;
    this.ctx = newCtx;

    return this;
  }

  /**
   * 裁剪图片
   */
  async crop(left: number, top: number, width: number, height: number): Promise<ImageProcessor> {
    await this.initialize();
    
    if (!this.canvas || !this.ctx) {
      console.warn('Canvas not available, skipping crop operation');
      return this;
    }

    const imageData = this.ctx.getImageData(left, top, width, height);
    
    this.canvas = new OffscreenCanvas(width, height);
    this.ctx = this.canvas.getContext('2d');
    
    if (!this.ctx) {
      throw new Error('Failed to get 2D rendering context');
    }
    
    this.ctx.putImageData(imageData, 0, 0);

    return this;
  }

  /**
   * 旋转图片
   */
  async rotate(angle: number): Promise<ImageProcessor> {
    await this.initialize();
    
    if (!this.canvas || !this.ctx) {
      console.warn('Canvas not available, skipping rotate operation');
      return this;
    }

    const radians = (angle * Math.PI) / 180;
    const cos = Math.abs(Math.cos(radians));
    const sin = Math.abs(Math.sin(radians));
    
    const newWidth = this.canvas.width * cos + this.canvas.height * sin;
    const newHeight = this.canvas.width * sin + this.canvas.height * cos;
    
    const newCanvas = new OffscreenCanvas(newWidth, newHeight);
    const newCtx = newCanvas.getContext('2d');
    
    if (!newCtx) {
      throw new Error('Failed to get 2D rendering context');
    }
    
    newCtx.translate(newWidth / 2, newHeight / 2);
    newCtx.rotate(radians);
    newCtx.drawImage(this.canvas, -this.canvas.width / 2, -this.canvas.height / 2);
    
    this.canvas = newCanvas;
    this.ctx = newCtx;

    return this;
  }

  /**
   * 转换为灰度图
   */
  async grayscale(): Promise<ImageProcessor> {
    await this.initialize();
    
    if (!this.canvas || !this.ctx) {
      console.warn('Canvas not available, skipping grayscale operation');
      return this;
    }

    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      data[i] = gray;     // red
      data[i + 1] = gray; // green
      data[i + 2] = gray; // blue
      // alpha channel (i + 3) remains unchanged
    }

    this.ctx.putImageData(imageData, 0, 0);
    return this;
  }

  /**
   * 调整亮度
   */
  async brightness(value: number): Promise<ImageProcessor> {
    await this.initialize();
    
    if (!this.canvas || !this.ctx) {
      console.warn('Canvas not available, skipping brightness operation');
      return this;
    }

    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;
    const adjustment = (value - 1) * 255;

    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.max(0, Math.min(255, data[i] + adjustment));     // red
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + adjustment)); // green
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + adjustment)); // blue
    }

    this.ctx.putImageData(imageData, 0, 0);
    return this;
  }

  /**
   * 调整对比度
   */
  async contrast(value: number): Promise<ImageProcessor> {
    await this.initialize();
    
    if (!this.canvas || !this.ctx) {
      console.warn('Canvas not available, skipping contrast operation');
      return this;
    }

    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;
    const factor = (259 * (value * 255 + 255)) / (255 * (259 - value * 255));

    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.max(0, Math.min(255, factor * (data[i] - 128) + 128));     // red
      data[i + 1] = Math.max(0, Math.min(255, factor * (data[i + 1] - 128) + 128)); // green
      data[i + 2] = Math.max(0, Math.min(255, factor * (data[i + 2] - 128) + 128)); // blue
    }

    this.ctx.putImageData(imageData, 0, 0);
    return this;
  }

  /**
   * 调整饱和度
   */
  async saturation(value: number): Promise<ImageProcessor> {
    await this.initialize();
    
    if (!this.canvas || !this.ctx) {
      console.warn('Canvas not available, skipping saturation operation');
      return this;
    }

    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      
      data[i] = Math.max(0, Math.min(255, gray + (r - gray) * value));
      data[i + 1] = Math.max(0, Math.min(255, gray + (g - gray) * value));
      data[i + 2] = Math.max(0, Math.min(255, gray + (b - gray) * value));
    }

    this.ctx.putImageData(imageData, 0, 0);
    return this;
  }

  /**
   * 应用模糊效果
   */
  async blur(sigma: number): Promise<ImageProcessor> {
    await this.initialize();
    
    if (!this.canvas || !this.ctx) {
      console.warn('Canvas not available, skipping blur operation');
      return this;
    }

    // Simple box blur implementation
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;
    const width = this.canvas.width;
    const height = this.canvas.height;
    const radius = Math.max(1, Math.floor(sigma));

    const blurredData = new Uint8ClampedArray(data);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, a = 0;
        let count = 0;

        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const ny = y + dy;
            const nx = x + dx;

            if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
              const index = (ny * width + nx) * 4;
              r += data[index];
              g += data[index + 1];
              b += data[index + 2];
              a += data[index + 3];
              count++;
            }
          }
        }

        const index = (y * width + x) * 4;
        blurredData[index] = r / count;
        blurredData[index + 1] = g / count;
        blurredData[index + 2] = b / count;
        blurredData[index + 3] = a / count;
      }
    }

    const newImageData = new ImageData(blurredData, width, height);
    this.ctx.putImageData(newImageData, 0, 0);
    return this;
  }

  /**
   * 应用锐化效果
   */
  async sharpen(): Promise<ImageProcessor> {
    await this.initialize();
    
    if (!this.canvas || !this.ctx) {
      console.warn('Canvas not available, skipping sharpen operation');
      return this;
    }

    // Sharpen kernel
    const kernel = [
      [0, -1, 0],
      [-1, 5, -1],
      [0, -1, 0]
    ];

    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;
    const width = this.canvas.width;
    const height = this.canvas.height;
    const sharpenedData = new Uint8ClampedArray(data);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let r = 0, g = 0, b = 0;

        for (let ky = 0; ky < 3; ky++) {
          for (let kx = 0; kx < 3; kx++) {
            const px = x + kx - 1;
            const py = y + ky - 1;
            const index = (py * width + px) * 4;
            const weight = kernel[ky][kx];

            r += data[index] * weight;
            g += data[index + 1] * weight;
            b += data[index + 2] * weight;
          }
        }

        const index = (y * width + x) * 4;
        sharpenedData[index] = Math.max(0, Math.min(255, r));
        sharpenedData[index + 1] = Math.max(0, Math.min(255, g));
        sharpenedData[index + 2] = Math.max(0, Math.min(255, b));
      }
    }

    const newImageData = new ImageData(sharpenedData, width, height);
    this.ctx.putImageData(newImageData, 0, 0);
    return this;
  }

  /**
   * 批量处理图片
   */
  async process(options: ImageProcessingOptions): Promise<ImageProcessor> {
    // Check if Canvas is available before applying transformations
    await this.initialize();
    
    if (!this.canvas) {
      // Canvas is not available - skip processing but maintain the processor instance
      console.warn('Canvas API not available, skipping image processing operations');
      return this;
    }

    // 调整大小
    if (options.width || options.height) {
      await this.resize(options.width, options.height, options.fit);
    }

    // 裁剪
    if (options.crop) {
      await this.crop(options.crop.left, options.crop.top, options.crop.width, options.crop.height);
    }

    // 旋转
    if (options.rotate) {
      await this.rotate(options.rotate);
    }

    // 滤镜效果
    if (options.blur) {
      await this.blur(options.blur);
    }

    if (options.sharpen) {
      await this.sharpen();
    }

    // 灰度
    if (options.grayscale) {
      await this.grayscale();
    }

    // 颜色调整
    if (options.brightness) {
      await this.brightness(options.brightness);
    }

    if (options.contrast) {
      await this.contrast(options.contrast);
    }

    if (options.saturation) {
      await this.saturation(options.saturation);
    }

    return this;
  }

  /**
   * 输出处理后的图片数据
   */
  async toBuffer(format: 'jpeg' | 'png' | 'webp' = 'png', quality: number = 0.8): Promise<Uint8Array> {
    await this.initialize();
    
    if (this.canvas) {
      // Canvas is available - use it for conversion
      const mimeType = `image/${format}`;
      const blob = await this.canvas.convertToBlob({ type: mimeType, quality });
      const arrayBuffer = await blob.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    } else {
      // Canvas is not available - return original image data
      // In a real-world scenario, you might want to use a different image processing library
      return this.imageData;
    }
  }

  /**
   * 创建图片处理器实例
   */
  static create(imageData: Uint8Array): ImageProcessor {
    return new ImageProcessor(imageData);
  }

  /**
   * 验证图片格式
   */
  static isValidImageFormat(imageData: Uint8Array): boolean {
    const signatures = [
      { format: 'jpeg', signature: [0xFF, 0xD8, 0xFF] },
      { format: 'png', signature: [0x89, 0x50, 0x4E, 0x47] },
      { format: 'gif', signature: [0x47, 0x49, 0x46] },
      { format: 'webp', signature: [0x52, 0x49, 0x46, 0x46] },
      { format: 'bmp', signature: [0x42, 0x4D] }
    ];

    for (const { signature } of signatures) {
      if (signature.every((byte, index) => imageData[index] === byte)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 获取图片MIME类型
   */
  static getMimeType(format: string): string {
    const mimeTypes: Record<string, string> = {
      jpeg: 'image/jpeg',
      jpg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      bmp: 'image/bmp'
    };

    return mimeTypes[format.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * 从图片头部信息提取基本信息（用于无Canvas环境）
   */
  private extractImageInfo(): { width: number; height: number } {
    const format = this.detectFormat();
    
    switch (format) {
      case 'png':
        return this.extractPngInfo();
      case 'jpeg':
        return this.extractJpegInfo();
      case 'gif':
        return this.extractGifInfo();
      case 'bmp':
        return this.extractBmpInfo();
      case 'webp':
        return this.extractWebpInfo();
      default:
        // 默认尺寸，避免错误
        return { width: 100, height: 100 };
    }
  }

  /**
   * 提取PNG图片信息
   */
  private extractPngInfo(): { width: number; height: number } {
    // PNG IHDR chunk starts at byte 8
    // Width: bytes 16-19, Height: bytes 20-23 (big-endian)
    if (this.imageData.length < 24) {
      return { width: 100, height: 100 };
    }
    
    const width = (this.imageData[16] << 24) | (this.imageData[17] << 16) | 
                  (this.imageData[18] << 8) | this.imageData[19];
    const height = (this.imageData[20] << 24) | (this.imageData[21] << 16) | 
                   (this.imageData[22] << 8) | this.imageData[23];
    
    return { width, height };
  }

  /**
   * 提取JPEG图片信息
   */
  private extractJpegInfo(): { width: number; height: number } {
    // Scan for SOF markers in JPEG
    for (let i = 2; i < this.imageData.length - 9; i++) {
      if (this.imageData[i] === 0xFF) {
        const marker = this.imageData[i + 1];
        // SOF0, SOF1, SOF2 markers
        if (marker === 0xC0 || marker === 0xC1 || marker === 0xC2) {
          // Height at offset 5-6, Width at offset 7-8 (big-endian)
          const height = (this.imageData[i + 5] << 8) | this.imageData[i + 6];
          const width = (this.imageData[i + 7] << 8) | this.imageData[i + 8];
          return { width, height };
        }
      }
    }
    return { width: 100, height: 100 };
  }

  /**
   * 提取GIF图片信息
   */
  private extractGifInfo(): { width: number; height: number } {
    // GIF dimensions at bytes 6-9 (little-endian)
    if (this.imageData.length < 10) {
      return { width: 100, height: 100 };
    }
    
    const width = this.imageData[6] | (this.imageData[7] << 8);
    const height = this.imageData[8] | (this.imageData[9] << 8);
    
    return { width, height };
  }

  /**
   * 提取BMP图片信息
   */
  private extractBmpInfo(): { width: number; height: number } {
    // BMP dimensions at bytes 18-25 (little-endian, 4 bytes each)
    if (this.imageData.length < 26) {
      return { width: 100, height: 100 };
    }
    
    const width = this.imageData[18] | (this.imageData[19] << 8) | 
                  (this.imageData[20] << 16) | (this.imageData[21] << 24);
    const height = this.imageData[22] | (this.imageData[23] << 8) | 
                   (this.imageData[24] << 16) | (this.imageData[25] << 24);
    
    return { width, height: Math.abs(height) };
  }

  /**
   * 提取WebP图片信息
   */
  private extractWebpInfo(): { width: number; height: number } {
    // Simple WebP format check
    if (this.imageData.length < 30) {
      return { width: 100, height: 100 };
    }
    
    // Check for VP8 format
    if (this.imageData[12] === 0x56 && this.imageData[13] === 0x50 && this.imageData[14] === 0x38) {
      // VP8 format
      if (this.imageData[15] === 0x20) {
        // VP8 lossy
        const width = ((this.imageData[26] | (this.imageData[27] << 8)) & 0x3FFF) + 1;
        const height = ((this.imageData[28] | (this.imageData[29] << 8)) & 0x3FFF) + 1;
        return { width, height };
      }
    }
    
    return { width: 100, height: 100 };
  }
}

export default ImageProcessor;
