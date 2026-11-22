/**
 * 收藏路由 / Wishlist Routes
 * @description 定义用户收藏相关的所有 API 端点
 * @module routes/wishlistRoutes
 */

import { Router } from 'express';
import Joi from 'joi';

import {
  getWishlist, addToWishlist, removeFromWishlist,
} from '@/controllers/user.controller.js';

import { authenticate } from '@/middleware/auth.js';
import { asyncHandler as errorAsyncHandler } from '@/middleware/errorHandler.js';
import { validateRequest, uuidParamSchema } from '@/middleware/validator.js';

const router = Router();

router.use(authenticate);

/**
 * @route GET /api/v1/wishlist
 * @summary 获取收藏列表 / Get wishlist
 * @access Private
 */
router.get('/', errorAsyncHandler(getWishlist));

/**
 * @route POST /api/v1/wishlist
 * @summary 添加收藏 / Add to wishlist
 * @access Private
 * @body {string} product_id - 商品 ID
 */
router.post(
  '/',
  validateRequest({
    body: Joi.object({ product_id: Joi.string().uuid().required() }),
  }),
  errorAsyncHandler(addToWishlist)
);

/**
 * @route DELETE /api/v1/wishlist/:productId
 * @summary 移除收藏 / Remove from wishlist
 * @access Private
 */
router.delete('/:productId', errorAsyncHandler(removeFromWishlist));

export default router;
