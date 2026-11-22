/**
 * 请求验证中间件
 * Request Validation Middleware
 *
 * @description 使用 Joi 验证请求参数、查询参数、请求体
 *              Validate request params, query, body using Joi
 * @module middleware/validator
 */

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { AppError, validationError } from './errorHandler.js';

/**
 * 验证请求的不同部分
 * Validate different parts of the request
 *
 * @param {Object} schemas - 验证规则集合
 * @param {Joi.ObjectSchema} [schemas.body] - 请求体验证规则
 * @param {Joi.ObjectSchema} [schemas.query] - 查询参数验证规则
 * @param {Joi.ObjectSchema} [schemas.params] - 路径参数验证规则
 * @returns {Function} Express 中间件函数
 *
 * @example
 * validateRequest({
 *   body: Joi.object({ name: Joi.string().required() }),
 *   query: Joi.object({ page: Joi.number().integer() }),
 *   params: Joi.object({ id: Joi.string().uuid() }),
 * })
 */
export function validateRequest(schemas: {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
}) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const errors: { field: string; message: string }[] = [];

    // 验证请求体 / Validate request body
    if (schemas.body) {
      const { error, value } = schemas.body.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
        allowUnknown: false,
      });

      if (error) {
        for (const detail of error.details) {
          errors.push({
            field: detail.path.join('.'),
            message: detail.message,
          });
        }
        req.body = value; // 使用验证后的值 / Use validated value
      }
    }

    // 验证查询参数 / Validate query parameters
    if (schemas.query) {
      const { error } = schemas.query.validate(req.query, {
        abortEarly: false,
        allowUnknown: true,
        stripUnknown: true,
      });

      if (error) {
        for (const detail of error.details) {
          errors.push({
            field: `query.${detail.path.join('.')}`,
            message: detail.message,
          });
        }
      }
    }

    // 验证路径参数 / Validate path parameters
    if (schemas.params) {
      const { error } = schemas.params.validate(req.params, {
        abortEarly: false,
        allowUnknown: false,
      });

      if (error) {
        for (const detail of error.details) {
          errors.push({
            field: `params.${detail.path.join('.')}`,
            message: detail.message,
          });
        }
      }
    }

    // 返回验证错误 / Return validation errors
    if (errors.length > 0) {
      const error = validationError('请求验证失败 / Request validation failed', errors);
      next(error);
      return;
    }

    next();
  };
}

/**
 * 分页参数验证规则
 * Pagination parameter validation schema
 */
export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(24),
  sort_by: Joi.string().valid(
    'created_at', 'price', 'rating_average', 'sold_count', 'name'
  ).default('created_at'),
  sort_order: Joi.string().valid('asc', 'desc').default('desc'),
});

/**
 * 搜索参数验证规则
 * Search parameter validation schema
 */
export const searchSchema = Joi.object({
  q: Joi.string().max(200).allow(''),
  category_id: Joi.string().uuid().allow(null),
  brand_id: Joi.string().uuid().allow(null),
  min_price: Joi.number().min(0).allow(null),
  max_price: Joi.number().min(0).allow(null),
  rating: Joi.number().integer().min(1).max(5).allow(null),
  in_stock: Joi.boolean().optional(),
  is_featured: Joi.boolean().optional(),
  is_new: Joi.boolean().optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(24),
});

/**
 * UUID 参数验证规则
 * UUID parameter validation schema
 */
export const uuidParamSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    'any.required': 'ID 为必填项 / ID is required',
    'string.uuid': 'ID 格式不正确 / Invalid ID format',
  }),
});

/**
 * 分页参数工具函数
 * Extract and validate pagination params
 */
export function extractPagination(query: any): { page: number; limit: number; offset: number } {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 24));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * 构建排序 SQL
 * Build ORDER BY SQL clause
 */
export function buildSortClause(sortBy: string, sortOrder: string): string {
  const allowedSortFields = [
    'created_at', 'price', 'rating_average', 'sold_count', 'name', 'view_count',
  ];
  const field = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
  const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

  return `ORDER BY ${field} ${order}`;
}
