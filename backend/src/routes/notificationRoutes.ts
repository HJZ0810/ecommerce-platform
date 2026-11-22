/**
 * 通知路由 / Notification Routes
 * @description 定义通知相关的所有 API 端点
 * @module routes/notificationRoutes
 */

import { Router } from 'express';

import {
  getNotifications, getUnreadCount, markAsRead, markAllAsRead, deleteNotification,
} from '@/controllers/notification.controller.js';

import { authenticate } from '@/middleware/auth.js';
import { asyncHandler as errorAsyncHandler } from '@/middleware/errorHandler.js';
import { validateRequest, paginationSchema, uuidParamSchema } from '@/middleware/validator.js';

const router = Router();

router.use(authenticate);

/**
 * @route GET /api/v1/notifications
 * @summary 获取通知列表 / Get notifications
 * @access Private
 * @query {number} [page=1] - 页码
 * @query {number} [limit=20] - 每页数量
 * @query {boolean} [is_read] - 筛选已读/未读
 */
router.get('/', validateRequest({ query: paginationSchema }), errorAsyncHandler(getNotifications));

/**
 * @route GET /api/v1/notifications/unread-count
 * @summary 获取未读通知数量 / Get unread notification count
 * @access Private
 */
router.get('/unread-count', errorAsyncHandler(getUnreadCount));

/**
 * @route PUT /api/v1/notifications/:id/read
 * @summary 标记通知为已读 / Mark notification as read
 * @access Private
 */
router.put('/:id/read', validateRequest({ params: uuidParamSchema }), errorAsyncHandler(markAsRead));

/**
 * @route PUT /api/v1/notifications/read-all
 * @summary 标记所有通知为已读 / Mark all notifications as read
 * @access Private
 */
router.put('/read-all', errorAsyncHandler(markAllAsRead));

/**
 * @route DELETE /api/v1/notifications/:id
 * @summary 删除通知 / Delete notification
 * @access Private
 */
router.delete('/:id', validateRequest({ params: uuidParamSchema }), errorAsyncHandler(deleteNotification));

export default router;
