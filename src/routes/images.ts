import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { ImageProcessor } from '../utils/imageProcessor';
import { uploadMiddleware, getUploadedFile, getUploadedFiles } from '../middleware/upload';
import {
  imageProcessingSchema,
  cropSchema,
  resizeSchema,
  validateImageFormat,
  validateFilterType,
  type ImageProcessingOptions,
  type CropOptions,
  type ResizeOptions
} from '../utils/validation';
import { Errors, handleError, asyncHandler, formatSuccessResponse } from '../utils/errors';

const images = new Hono();

// 应用上传中间件
images.use('*', uploadMiddleware({
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif', 'image/bmp'],
  maxFiles: 1
}));

/**
 * 上传并处理图片
 * POST /images/process
 */
images.post('/process',
  zValidator('json', imageProcessingSchema, (result, c) => {
    if (!result.success) {
      return c.json({ error: '参数验证失败', details: result.error.issues }, 400);
    }
  }),
  asyncHandler(async (c) => {
    const file = getUploadedFile(c, 'image');
    if (!file) {
      throw Errors.fileNotFound();
    }

    const options = await c.req.json() as ImageProcessingOptions;

    // 处理图片
    const processor = ImageProcessor.create(file.buffer);
    await processor.process(options);
    const outputFormat = options.format || 'png';
    const processedBuffer = await processor.toBuffer(outputFormat, options.quality ? options.quality / 100 : 0.8);

    // 获取处理后的图片信息
    const processedProcessor = ImageProcessor.create(processedBuffer);
    const info = await processedProcessor.getInfo();

    // 确定输出格式和MIME类型
    const mimeType = ImageProcessor.getMimeType(outputFormat);

    // 设置响应头
    c.header('Content-Type', mimeType);
    c.header('Content-Length', processedBuffer.length.toString());
    c.header('X-Image-Width', info.width.toString());
    c.header('X-Image-Height', info.height.toString());
    c.header('X-Image-Format', info.format);
    c.header('X-Image-Size', info.size.toString());

    return c.body(processedBuffer);
  })
);

/**
 * 获取图片信息
 * POST /images/info
 */
images.post('/info', asyncHandler(async (c) => {
  const file = getUploadedFile(c, 'image');
  if (!file) {
    throw Errors.fileNotFound();
  }

  const processor = ImageProcessor.create(file.buffer);
  const info = await processor.getInfo();

  return c.json(formatSuccessResponse({
    original: {
      name: file.name,
      type: file.type,
      size: file.size
    },
    image: info
  }));
}));

/**
 * 调整图片大小
 * POST /images/resize
 */
images.post('/resize',
  zValidator('json', resizeSchema, (result, c) => {
    if (!result.success) {
      return c.json({ error: '参数验证失败', details: result.error.issues }, 400);
    }
  }),
  asyncHandler(async (c) => {
    const file = getUploadedFile(c, 'image');
    if (!file) {
      throw Errors.fileNotFound();
    }

    const { width, height, fit = 'cover' } = await c.req.json() as ResizeOptions;

    const processor = ImageProcessor.create(file.buffer);
    processor.resize(width, height, fit);
    const processedBuffer = await processor.toBuffer();

    c.header('Content-Type', file.type);
    c.header('Content-Length', processedBuffer.length.toString());

    return c.body(processedBuffer);
  })
);

/**
 * 裁剪图片
 * POST /images/crop
 */
images.post('/crop',
  zValidator('json', cropSchema, (result, c) => {
    if (!result.success) {
      return c.json({ error: '参数验证失败', details: result.error.issues }, 400);
    }
  }),
  asyncHandler(async (c) => {
    const file = getUploadedFile(c, 'image');
    if (!file) {
      throw Errors.fileNotFound();
    }

    const { left, top, width, height } = await c.req.json() as CropOptions;

    const processor = ImageProcessor.create(file.buffer);
    processor.crop(left, top, width, height);
    const processedBuffer = await processor.toBuffer();

    c.header('Content-Type', file.type);
    c.header('Content-Length', processedBuffer.length.toString());

    return c.body(processedBuffer);
  })
);

/**
 * 转换图片格式
 * POST /images/convert/:format
 */
images.post('/convert/:format', asyncHandler(async (c) => {
  const format = c.req.param('format') as 'jpeg' | 'png' | 'webp';

  if (!validateImageFormat(format)) {
    throw Errors.invalidFormat(format);
  }

  const file = getUploadedFile(c, 'image');
  if (!file) {
    throw Errors.fileNotFound();
  }

  const quality = parseInt(c.req.query('quality') || '80') / 100; // Convert to 0-1 range

  const processor = ImageProcessor.create(file.buffer);
  const processedBuffer = await processor.toBuffer(format, quality);

  const mimeType = ImageProcessor.getMimeType(format);
  c.header('Content-Type', mimeType);
  c.header('Content-Length', processedBuffer.length.toString());

  return c.body(processedBuffer);
}));

/**
 * 应用滤镜效果
 * POST /images/filter/:type
 */
images.post('/filter/:type', asyncHandler(async (c) => {
  const filterType = c.req.param('type');

  if (!validateFilterType(filterType)) {
    throw Errors.invalidFormat(`滤镜类型: ${filterType}`);
  }

  const file = getUploadedFile(c, 'image');
  if (!file) {
    throw Errors.fileNotFound();
  }

  const processor = ImageProcessor.create(file.buffer);

  switch (filterType) {
    case 'grayscale':
      await processor.grayscale();
      break;
    case 'blur':
      const sigma = parseFloat(c.req.query('sigma') || '1');
      await processor.blur(sigma);
      break;
    case 'sharpen':
      await processor.sharpen();
      break;
  }

  const processedBuffer = await processor.toBuffer();

  c.header('Content-Type', file.type);
  c.header('Content-Length', processedBuffer.length.toString());

  return c.body(processedBuffer);
}));

/**
 * 批量处理多张图片
 * POST /images/batch
 */
images.post('/batch',
  zValidator('json', imageProcessingSchema, (result, c) => {
    if (!result.success) {
      return c.json({ error: '参数验证失败', details: result.error.issues }, 400);
    }
  }),
  asyncHandler(async (c) => {
    const files = getUploadedFiles(c);
    if (files.length === 0) {
      throw Errors.fileNotFound();
    }

    const options = await c.req.json() as ImageProcessingOptions;
    const results = [];

    for (const file of files) {
      try {
        const processor = ImageProcessor.create(file.buffer);
        await processor.process(options);
        const outputFormat = options.format || 'png';
        const processedBuffer = await processor.toBuffer(outputFormat, options.quality ? options.quality / 100 : 0.8);

        // Convert Uint8Array to base64
        const base64String = btoa(String.fromCharCode(...processedBuffer));

        results.push({
          originalName: file.name,
          success: true,
          size: processedBuffer.length,
          data: base64String
        });
      } catch (error) {
        results.push({
          originalName: file.name,
          success: false,
          error: error instanceof Error ? error.message : '处理失败'
        });
      }
    }

    return c.json(formatSuccessResponse({
      processed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    }));
  })
);

export default images;
