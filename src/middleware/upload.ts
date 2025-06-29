import { Context, Next } from 'hono';
import { ImageProcessor } from '../utils/imageProcessor';

export interface UploadedFile {
  name: string;
  type: string;
  size: number;
  buffer: Uint8Array;
}

export interface FormField {
  name: string;
  value: string;
}

export interface UploadOptions {
  maxFileSize?: number; // 最大文件大小（字节）
  allowedTypes?: string[]; // 允许的MIME类型
  maxFiles?: number; // 最大文件数量
}

const DEFAULT_OPTIONS: UploadOptions = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif', 'image/bmp'],
  maxFiles: 5
};

/**
 * 解析multipart/form-data
 */
async function parseMultipartData(body: ArrayBuffer, boundary: string): Promise<{
  files: Map<string, UploadedFile[]>;
  fields: Map<string, string>;
}> {
  const decoder = new TextDecoder();
  const data = new Uint8Array(body);
  const boundaryBytes = new TextEncoder().encode(`--${boundary}`);
  const files = new Map<string, UploadedFile[]>();
  const fields = new Map<string, string>();

  let start = 0;
  let end = 0;

  while (end < data.length) {
    // 查找边界
    const boundaryIndex = findBoundary(data, boundaryBytes, start);
    if (boundaryIndex === -1) break;

    if (start > 0) {
      // 处理当前部分
      const partData = data.slice(start, boundaryIndex);
      const result = await parsePart(partData);
      if (result) {
        if (result.type === 'file') {
          const fieldName = result.fieldName;
          if (!files.has(fieldName)) {
            files.set(fieldName, []);
          }
          files.get(fieldName)!.push(result.file!);
        } else if (result.type === 'field') {
          fields.set(result.fieldName, result.value!);
        }
      }
    }

    start = boundaryIndex + boundaryBytes.length;
    // 跳过CRLF
    if (data[start] === 0x0D && data[start + 1] === 0x0A) {
      start += 2;
    }
  }

  return { files, fields };
}

/**
 * 查找边界位置
 */
function findBoundary(data: Uint8Array, boundary: Uint8Array, start: number): number {
  for (let i = start; i <= data.length - boundary.length; i++) {
    let match = true;
    for (let j = 0; j < boundary.length; j++) {
      if (data[i + j] !== boundary[j]) {
        match = false;
        break;
      }
    }
    if (match) return i;
  }
  return -1;
}

/**
 * 解析单个部分
 */
async function parsePart(data: Uint8Array): Promise<
  | { type: 'file'; fieldName: string; file: UploadedFile }
  | { type: 'field'; fieldName: string; value: string }
  | null
> {
  const decoder = new TextDecoder();
  
  // 查找头部结束位置（双CRLF）
  const headerEnd = findHeaderEnd(data);
  if (headerEnd === -1) return null;

  const headerData = data.slice(0, headerEnd);
  const bodyData = data.slice(headerEnd + 4); // 跳过双CRLF

  const headers = decoder.decode(headerData);
  const dispositionMatch = headers.match(/Content-Disposition:\s*form-data;\s*name="([^"]+)"(?:;\s*filename="([^"]*)")?/i);
  const typeMatch = headers.match(/Content-Type:\s*([^\r\n]+)/i);

  if (!dispositionMatch) return null;

  const fieldName = dispositionMatch[1];
  const filename = dispositionMatch[2];
  const contentType = typeMatch ? typeMatch[1].trim() : 'application/octet-stream';

  // 如果有filename，则是文件字段
  if (filename) {
    return {
      type: 'file',
      fieldName,
      file: {
        name: filename,
        type: contentType,
        size: bodyData.length,
        buffer: new Uint8Array(bodyData)
      }
    };
  } else {
    // 否则是普通文本字段
    return {
      type: 'field',
      fieldName,
      value: decoder.decode(bodyData).trim()
    };
  }
}

/**
 * 查找头部结束位置
 */
function findHeaderEnd(data: Uint8Array): number {
  for (let i = 0; i < data.length - 3; i++) {
    if (data[i] === 0x0D && data[i + 1] === 0x0A && 
        data[i + 2] === 0x0D && data[i + 3] === 0x0A) {
      return i;
    }
  }
  return -1;
}

/**
 * 验证文件
 */
function validateFile(file: UploadedFile, options: UploadOptions): string | null {
  // 检查文件大小
  if (options.maxFileSize && file.size > options.maxFileSize) {
    return `文件大小超过限制 (${Math.round(options.maxFileSize / 1024 / 1024)}MB)`;
  }

  // 检查文件类型
  if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
    return `不支持的文件类型: ${file.type}`;
  }

  // 验证图片格式
  if (!ImageProcessor.isValidImageFormat(file.buffer)) {
    return '无效的图片格式';
  }

  return null;
}

/**
 * 文件上传中间件
 */
export function uploadMiddleware(options: UploadOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return async (c: Context, next: Next) => {
    const contentType = c.req.header('content-type');
    
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return next();
    }

    try {
      // 提取boundary
      const boundaryMatch = contentType.match(/boundary=([^;]+)/);
      if (!boundaryMatch) {
        return c.json({ error: '无效的Content-Type' }, 400);
      }

      const boundary = boundaryMatch[1].replace(/"/g, '');
      const body = await c.req.arrayBuffer();

      // 解析multipart数据
      const { files: filesMap, fields } = await parseMultipartData(body, boundary);
      const allFiles: UploadedFile[] = [];

      // 验证所有文件
      for (const [fieldName, files] of filesMap) {
        for (const file of files) {
          const error = validateFile(file, opts);
          if (error) {
            return c.json({ error }, 400);
          }
          allFiles.push(file);
        }
      }

      // 检查文件数量
      if (opts.maxFiles && allFiles.length > opts.maxFiles) {
        return c.json({ error: `文件数量超过限制 (${opts.maxFiles})` }, 400);
      }

      // 将文件信息添加到上下文
      c.set('files', filesMap);
      c.set('fields', fields);
      c.set('uploadedFiles', allFiles);

      await next();
    } catch (error) {
      console.error('文件上传错误:', error);
      return c.json({ error: '文件上传失败' }, 500);
    }
  };
}

/**
 * 获取上传的文件
 */
export function getUploadedFiles(c: Context): UploadedFile[] {
  return c.get('uploadedFiles') || [];
}

/**
 * 获取指定字段的文件
 */
export function getUploadedFile(c: Context, fieldName: string): UploadedFile | null {
  const filesMap: Map<string, UploadedFile[]> = c.get('files');
  if (!filesMap || !filesMap.has(fieldName)) {
    return null;
  }
  const files = filesMap.get(fieldName)!;
  return files.length > 0 ? files[0] : null;
}

/**
 * 获取表单字段
 */
export function getFormField(c: Context, fieldName: string): string | null {
  const fields: Map<string, string> = c.get('fields');
  return fields?.get(fieldName) || null;
}

export default uploadMiddleware;
