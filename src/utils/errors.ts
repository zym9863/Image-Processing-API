import { Context } from 'hono';

// 错误类型枚举
export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  PROCESSING_ERROR = 'PROCESSING_ERROR',
  INVALID_FORMAT = 'INVALID_FORMAT',
  INVALID_DIMENSIONS = 'INVALID_DIMENSIONS',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

// 自定义错误类
export class APIError extends Error {
  public readonly type: ErrorType;
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(
    type: ErrorType,
    message: string,
    statusCode: number = 400,
    details?: any
  ) {
    super(message);
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'APIError';
  }
}

// 预定义错误
export const Errors = {
  // 验证错误
  validationError: (details?: any) => 
    new APIError(ErrorType.VALIDATION_ERROR, '参数验证失败', 400, details),
  
  // 文件相关错误
  fileNotFound: () => 
    new APIError(ErrorType.FILE_NOT_FOUND, '请上传图片文件', 400),
  
  invalidFileType: (type?: string) => 
    new APIError(ErrorType.INVALID_FILE_TYPE, `不支持的文件类型${type ? `: ${type}` : ''}`, 400),
  
  fileTooLarge: (maxSize: number) => 
    new APIError(ErrorType.FILE_TOO_LARGE, `文件大小超过限制 (${Math.round(maxSize / 1024 / 1024)}MB)`, 400),
  
  // 处理错误
  processingError: (message?: string) => 
    new APIError(ErrorType.PROCESSING_ERROR, message || '图片处理失败', 500),
  
  invalidFormat: (format?: string) => 
    new APIError(ErrorType.INVALID_FORMAT, `不支持的格式${format ? `: ${format}` : ''}`, 400),
  
  invalidDimensions: () => 
    new APIError(ErrorType.INVALID_DIMENSIONS, '图片尺寸无效', 400),
  
  // 内部错误
  internalError: (message?: string) => 
    new APIError(ErrorType.INTERNAL_ERROR, message || '服务器内部错误', 500)
};

// 错误响应格式
export interface ErrorResponse {
  error: string;
  type: ErrorType;
  details?: any;
  timestamp: string;
}

// 格式化错误响应
export function formatErrorResponse(error: APIError): ErrorResponse {
  return {
    error: error.message,
    type: error.type,
    details: error.details,
    timestamp: new Date().toISOString()
  };
}

// 处理错误并返回响应
export function handleError(c: Context, error: unknown): Response {
  console.error('API错误:', error);

  if (error instanceof APIError) {
    return c.json(formatErrorResponse(error), error.statusCode);
  }

  // 处理Zod验证错误
  if (error && typeof error === 'object' && 'issues' in error) {
    const validationError = Errors.validationError(error);
    return c.json(formatErrorResponse(validationError), 400);
  }

  // 处理Sharp错误
  if (error instanceof Error) {
    if (error.message.includes('Input file contains unsupported image format')) {
      const formatError = Errors.invalidFileType();
      return c.json(formatErrorResponse(formatError), 400);
    }
    
    if (error.message.includes('Input buffer contains unsupported image format')) {
      const formatError = Errors.invalidFileType();
      return c.json(formatErrorResponse(formatError), 400);
    }

    if (error.message.includes('Expected positive integer')) {
      const dimensionError = Errors.invalidDimensions();
      return c.json(formatErrorResponse(dimensionError), 400);
    }
  }

  // 默认内部错误
  const internalError = Errors.internalError();
  return c.json(formatErrorResponse(internalError), 500);
}

// 成功响应格式
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  timestamp: string;
}

// 格式化成功响应
export function formatSuccessResponse<T>(data: T): SuccessResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString()
  };
}

// 异步错误处理装饰器
export function asyncHandler(
  handler: (c: Context) => Promise<Response>
) {
  return async (c: Context): Promise<Response> => {
    try {
      return await handler(c);
    } catch (error) {
      return handleError(c, error);
    }
  };
}

// 验证中间件
export function validateRequest<T>(
  schema: any,
  source: 'json' | 'query' | 'param' = 'json'
) {
  return async (c: Context, next: () => Promise<void>) => {
    try {
      let data: any;
      
      switch (source) {
        case 'json':
          data = await c.req.json();
          break;
        case 'query':
          data = c.req.query();
          break;
        case 'param':
          data = c.req.param();
          break;
      }

      const result = schema.safeParse(data);
      
      if (!result.success) {
        throw Errors.validationError(result.error.issues);
      }

      c.set('validatedData', result.data);
      await next();
    } catch (error) {
      return handleError(c, error);
    }
  };
}

export default {
  APIError,
  Errors,
  handleError,
  formatErrorResponse,
  formatSuccessResponse,
  asyncHandler,
  validateRequest
};
