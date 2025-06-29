import { z } from 'zod';

// 图片处理选项验证模式
export const imageProcessingSchema = z.object({
  width: z.number().min(1).max(4000).optional(),
  height: z.number().min(1).max(4000).optional(),
  quality: z.number().min(1).max(100).optional(),
  format: z.enum(['jpeg', 'png', 'webp']).optional(),
  fit: z.enum(['cover', 'contain', 'fill', 'inside', 'outside']).optional(),
  blur: z.number().min(0.3).max(1000).optional(),
  sharpen: z.boolean().optional(),
  grayscale: z.boolean().optional(),
  rotate: z.number().min(-360).max(360).optional(),
  brightness: z.number().min(0.1).max(3).optional(),
  contrast: z.number().min(0.1).max(3).optional(),
  saturation: z.number().min(0).max(3).optional(),
  crop: z.object({
    left: z.number().min(0),
    top: z.number().min(0),
    width: z.number().min(1),
    height: z.number().min(1)
  }).optional()
});

// 裁剪参数验证模式
export const cropSchema = z.object({
  left: z.number().min(0),
  top: z.number().min(0),
  width: z.number().min(1),
  height: z.number().min(1)
});

// 调整大小参数验证模式
export const resizeSchema = z.object({
  width: z.number().min(1).max(4000).optional(),
  height: z.number().min(1).max(4000).optional(),
  fit: z.enum(['cover', 'contain', 'fill', 'inside', 'outside']).optional()
});

// 支持的图片格式
export const SUPPORTED_FORMATS = ['jpeg', 'png', 'webp'] as const;
export const SUPPORTED_MIME_TYPES = [
  'image/jpeg',
  'image/png', 
  'image/gif',
  'image/webp',
  'image/bmp'
] as const;

// 支持的滤镜类型
export const SUPPORTED_FILTERS = ['grayscale', 'blur', 'sharpen'] as const;

// 验证图片格式
export function validateImageFormat(format: string): boolean {
  return SUPPORTED_FORMATS.includes(format as any);
}

// 验证MIME类型
export function validateMimeType(mimeType: string): boolean {
  return SUPPORTED_MIME_TYPES.includes(mimeType as any);
}

// 验证滤镜类型
export function validateFilterType(filterType: string): boolean {
  return SUPPORTED_FILTERS.includes(filterType as any);
}

// 验证文件大小
export function validateFileSize(size: number, maxSize: number = 10 * 1024 * 1024): boolean {
  return size <= maxSize;
}

// 验证图片尺寸
export function validateImageDimensions(width: number, height: number): boolean {
  return width > 0 && height > 0 && width <= 4000 && height <= 4000;
}

// 验证裁剪参数
export function validateCropParams(
  crop: { left: number; top: number; width: number; height: number },
  imageWidth: number,
  imageHeight: number
): boolean {
  return (
    crop.left >= 0 &&
    crop.top >= 0 &&
    crop.width > 0 &&
    crop.height > 0 &&
    crop.left + crop.width <= imageWidth &&
    crop.top + crop.height <= imageHeight
  );
}

// 验证质量参数
export function validateQuality(quality: number): boolean {
  return quality >= 1 && quality <= 100;
}

// 验证旋转角度
export function validateRotation(angle: number): boolean {
  return angle >= -360 && angle <= 360;
}

// 验证模糊参数
export function validateBlur(sigma: number): boolean {
  return sigma >= 0.3 && sigma <= 1000;
}

// 验证颜色调整参数
export function validateColorAdjustment(value: number): boolean {
  return value >= 0.1 && value <= 3;
}

// 验证饱和度参数
export function validateSaturation(value: number): boolean {
  return value >= 0 && value <= 3;
}

export type ImageProcessingOptions = z.infer<typeof imageProcessingSchema>;
export type CropOptions = z.infer<typeof cropSchema>;
export type ResizeOptions = z.infer<typeof resizeSchema>;
