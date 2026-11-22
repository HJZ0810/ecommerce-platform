/**
 * 购物车路由
 * Cart Routes
 *
 * @description 定义购物车相关的所有 API 端点
 * @module routes/cartRoutes
 */

import { Router } from 'express';
import Joi from 'joi';

import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  mergeCart,
} from '@/controllers/cart.controller.js';

import { authenticate, optionalAuthenticate } from '@/middleware/auth.js';
import { asyncHandler as errorAsyncHandler } from '@/middleware/errorHandler.js';
import { validateRequest } from '@/middleware/validator.js';

const router = Router();

// 所有购物车接口需要认证 / All cart APIs require authentication
router.use(authenticate);

/**
 * @route GET /api/v1/cart
 * @summary 获取购物车内容 / Get cart
 * @access Private
 */
router.get('/', errorAsyncHandler(getCart));

/**
 * @route POST /api/v1/cart/items
 * @summary 添加商品到购物车 / Add item to cart
 * @access Private
 * @body {string} product_id - 商品 ID
 * @body {string} [variant_id] - 规格 ID
 * @body {number} quantity - 数量
 */
router.post(
  '/items',
  validateRequest({
    body: {
      product_id: Joi.string().uuid().required(),
      variant_id: Joi.string().uuid().allow(null),
      quantity: Joi.number().integer().min(1).required(),
    },
  }),
  errorAsyncHandler(addToCart)
);

/**
 * @route PUT /api/v1/cart/items/:itemId
 * @summary 更新购物车商品数量 / Update cart item quantity
 * @access Private
 */
router.put(
  '/items/:itemId',
  validateRequest({
    params: Joi.object({ itemId: Joi.string().uuid().required() }),
    body: {
      quantity: Joi.number().integer().min(1).required(),
    },
  }),
  errorAsyncHandler(updateCartItem)
);

/**
 * @route DELETE /api/v1/cart/items/:itemId
 * @summary 删除购物车商品 / Remove item from cart
 * @access Private
 */
router.delete(
  '/items/:itemId',
  validateRequest({
    params: Joi.object({ itemId: Joi.string().uuid().required() }),
  }),
  errorAsyncHandler(removeFromCart)
);

/**
 * @route DELETE /api/v1/cart/items
 * @summary 清空购物车 / Clear cart
 * @access Private
 */
router.delete('/items', errorAsyncHandler(clearCart));

/**
 * @route POST /api/v1/cart/merge
 * @summary 合并购物车（登录后合并游客购物车）/ Merge guest cart
 * @access Private
 * @body {string} session_id - 游客会话 ID
 * @body {Array} items - 游客购物车商品列表
 */
router.post(
  '/merge',
  validateRequest({
    body: {
      session_id: Joi.string().required(),
      items: Joi.array().items(
        Joi.object({
          product_id: Joi.string().uuid().required(),
          variant_id: Joi.string().uuid().allow(null),
          quantity: Joi.number().integer().min(1).required(),
        })
      ).required(),
    },
  }),
  errorAsyncHandler(mergeCart)
);

export default router;
