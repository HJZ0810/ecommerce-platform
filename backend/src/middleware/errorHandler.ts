/**
 * 全局错误处理中间件
 * Global Error Handler Middleware
 *
 * @description 统一处理所有错误，返回标准化的错误响应格式
 *              Unified error handling with standardized response format
 * @module middleware/errorHandler
 */

import { Request, Response, NextFunction } from 'express';

/**
 * 自定义错误类
 * Custom error class for application errors
 *
 * @extends Error
 */
export class AppError extends Error {
  /**
   * HTTP 状态码
   * @type {number}
   */
  statusCode: number;

  /**
   * 是否可公开展示的错误信息
   * Whether the error message is safe to show to users
   * @type {boolean}
   */
  isOperational: boolean;

  /**
   * 错误代码（用于前端国际化）
   * Error code for i18n
   * @type {string}
   */
  errorCode?: string;

  /**
   * 错误详情
   * Error details (validation errors, etc.)
   * @type {any[]}
   */
  details?: any[];

  /**
   * 创建应用错误
   * @param {string} message - 错误信息
   * @param {number} statusCode - HTTP 状态码
   * @param {boolean} isOperational - 是否为业务错误
   * @param {string} [errorCode] - 错误代码
   * @param {any[]} [details] - 错误详情
   */
  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    errorCode?: string,
    details?: any[]
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errorCode = errorCode;
    this.details = details;

    // 保持堆栈跟踪 / Preserve stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 预定义错误工厂 / Predefined error factories
 */
export class ErrorFactory {
  static badRequest(message: string, errorCode: string = 'BAD_REQUEST', details?: any[]) {
    return new AppError(message, 400, true, errorCode, details);
  }

  static unauthorized(message: string = '未授权访问 / Unauthorized', errorCode: string = 'UNAUTHORIZED') {
    return new AppError(message, 401, true, errorCode);
  }

  static forbidden(message: string = '禁止访问 / Forbidden', errorCode: string = 'FORBIDDEN') {
    return new AppError(message, 403, true, errorCode);
  }

  static notFound(message: string, errorCode: string = 'NOT_FOUND') {
    return new AppError(message, 404, true, errorCode);
  }

  static conflict(message: string, errorCode: string = 'CONFLICT') {
    return new AppError(message, 409, true, errorCode);
  }

  static validationError(message: string, details?: any[]) {
    return new AppError(message, 422, true, 'VALIDATION_ERROR', details);
  }

  static internal(message: string = '服务器内部错误 / Internal Server Error') {
    return new AppError(message, 500, false, 'INTERNAL_ERROR');
  }

  static serviceUnavailable(message: string = '服务暂时不可用 / Service Unavailable') {
    return new AppError(message, 503, true, 'SERVICE_UNAVAILABLE');
  }
}

/**
 * 全局错误处理中间件
 * Global error handling middleware
 *
 * @param {Error} error - 错误对象
 * @param {Request} req - 请求对象
 * @param {Response} res - 响应对象
 * @param {NextFunction} next - 下一个中间件
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const statusCode = (error as any).statusCode || 500;
  const message = error.message || '服务器内部错误 / Internal Server Error';
  const errorCode = (error as any).errorCode || 'INTERNAL_ERROR';
  const details = (error as any).details;

  // 记录错误日志 / Log the error
  console.error(`[${new Date().toISOString()}] Error:`, {
    message: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    statusCode,
  });

  // 生产环境不暴露内部错误详情
  const isProduction = process.env.NODE_ENV === 'production';
  const publicMessage = isProduction && statusCode === 500
    ? '服务器内部错误 / Internal Server Error'
    : message;

  const response: any = {
    success: false,
    error: publicMessage,
    error_zh: publicMessage, // 中文错误信息
    errorCode,
  };

  // 包含验证错误详情
  if (details && details.length > 0) {
    response.details = details;
  }

  // 开发环境返回堆栈信息
  if (!isProduction && error.stack) {
    response.stack = error.stack;
  }

  res.status(statusCode).json(response);
}

/**
 * 404 处理中间件
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} not found`,
    error_zh: `路由 ${req.originalUrl} 未找到`,
    errorCode: 'ROUTE_NOT_FOUND',
  });
}

/**
 * 异步路由包装器
 * Async route handler wrapper - eliminates need for try/catch in controllers
 *
 * @param {Function} fn - 异步路由处理函数
 * @returns {Function} 包装后的处理函数
 *
 * @example
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await userService.findAll();
 *   res.json({ success: true, data: users });
 * }));
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
