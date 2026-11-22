/**
 * 用户路由 / User Routes
 * @description 定义用户个人资料、地址管理、收藏、浏览历史等 API
 * @module routes/userRoutes
 */

import { Router } from 'express';
import Joi from 'joi';

import {
  getMe, updateProfile,
  getAddresses, createAddress, updateAddress, deleteAddress,
  getWishlist, addToWishlist, removeFromWishlist,
  getRecentlyViewed, addRecentlyViewed, getNotifications as getUserNotifications,
} from '@/controllers/user.controller.js';

import { authenticate } from '@/middleware/auth.js';
import { asyncHandler as errorAsyncHandler } from '@/middleware/errorHandler.js';
import { validateRequest, uuidParamSchema } from '@/middleware/validator.js';

const router = Router();

router.use(authenticate);

/**
 * @route GET /api/v1/users/me
 * @summary 获取当前用户信息 / Get current user profile
 * @access Private
 */
router.get('/me', errorAsyncHandler(getMe));

/**
 * @route PUT /api/v1/users/me
 * @summary 更新个人资料 / Update profile
 * @access Private
 * @body {string} [first_name] - 名字
 * @body {string} [last_name] - 姓氏
 * @body {string} [display_name] - 显示名称
 * @body {string} [gender] - 性别
 * @body {string} [birthday] - 生日 (ISO date)
 * @body {string} [avatar_url] - 头像 URL
 */
router.put(
  '/me',
  validateRequest({
    body: Joi.object({
      first_name: Joi.string().max(100).allow(''),
      last_name: Joi.string().max(100).allow(''),
      display_name: Joi.string().max(200).allow(''),
      gender: Joi.string().valid('male', 'female', 'other', 'prefer_not_to_say').allow(''),
      birthday: Joi.date().iso().allow(null),
      avatar_url: Joi.string().uri().allow(''),
    }),
  }),
  errorAsyncHandler(updateProfile)
);

// 地址管理
/**
 * @route GET /api/v1/users/me/addresses
 * @summary 获取地址列表 / Get addresses
 * @access Private
 */
router.get('/me/addresses', errorAsyncHandler(getAddresses));

/**
 * @route POST /api/v1/users/me/addresses
 * @summary 创建地址 / Create address
 * @access Private
 */
router.post(
  '/me/addresses',
  validateRequest({
    body: Joi.object({
      label: Joi.string().max(50).allow(''),
      recipient_name: Joi.string().max(200).required(),
      recipient_phone: Joi.string().max(20).required(),
      country: Joi.string().max(100).allow(''),
      province: Joi.string().max(100).required(),
      city: Joi.string().max(100).required(),
      district: Joi.string().max(100).allow(''),
      street_address: Joi.string().required(),
      postal_code: Joi.string().max(20).allow(''),
      is_default: Joi.boolean().default(false),
    }),
  }),
  errorAsyncHandler(createAddress)
);

/**
 * @route PUT /api/v1/users/me/addresses/:id
 * @summary 更新地址 / Update address
 * @access Private
 */
router.put(
  '/me/addresses/:id',
  validateRequest({ params: uuidParamSchema }),
  validateRequest({
    body: Joi.object({
      label: Joi.string().max(50).allow(''),
      recipient_name: Joi.string().max(200).required(),
      recipient_phone: Joi.string().max(20).required(),
      province: Joi.string().max(100).required(),
      city: Joi.string().max(100).required(),
      district: Joi.string().max(100).allow(''),
      street_address: Joi.string().required(),
      postal_code: Joi.string().max(20).allow(''),
      is_default: Joi.boolean().default(false),
    }),
  }),
  errorAsyncHandler(updateAddress)
);

/**
 * @route DELETE /api/v1/users/me/addresses/:id
 * @summary 删除地址 / Delete address
 * @access Private
 */
router.delete('/me/addresses/:id', validateRequest({ params: uuidParamSchema }), errorAsyncHandler(deleteAddress));

// 收藏管理
router.get('/wishlist', errorAsyncHandler(getWishlist));

router.post(
  '/wishlist',
  validateRequest({ body: Joi.object({ product_id: Joi.string().uuid().required() }) }),
  errorAsyncHandler(addToWishlist)
);

router.delete('/wishlist/:productId', errorAsyncHandler(removeFromWishlist));

// 浏览历史
/**
 * @route GET /api/v1/users/me/recently-viewed
 * @summary 获取浏览历史 / Get recently viewed
 * @access Private
 */
router.get('/me/recently-viewed', errorAsyncHandler(getRecentlyViewed));

export default router;
