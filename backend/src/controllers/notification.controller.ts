/**
 * 通知控制器 / Notification Controller
 * @description 处理通知列表、已读标记、删除等 API
 * @module controllers/notification
 */

import { Request, Response, NextFunction } from 'express';
import { query, queryOne } from '@/config/database.js';
import { cacheService } from '@/config/redis.js';
import { AppError, asyncHandler } from '@/middleware/errorHandler.js';
import { validateRequest, paginationSchema, uuidParamSchema } from '@/middleware/validator.js';

/**
 * 获取通知列表 / Get notifications
 * @route GET /api/v1/notifications
 * @access Private
 */
export const getNotifications = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { page, limit, offset } = validateRequest.extractPagination(req.query as any);
  const { is_read } = req.query as any;

  let whereClause = 'WHERE user_id = $1';
  const params: any[] = [userId];

  if (is_read !== undefined) {
    whereClause += ` AND is_read = $${params.length + 1}`;
    params.push(is_read === 'true');
  }

  const countResult = await query(`SELECT COUNT(*) as total FROM notifications ${whereClause}`, params);

  const result = await query(
    `SELECT id, notification_type, title, content, data, is_read, read_at, created_at
     FROM notifications ${whereClause} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  res.json({
    success: true,
    data: result.rows,
    pagination: {
      page, limit,
      total: parseInt(countResult.rows[0]?.total || '0'),
      total_pages: Math.ceil(parseInt(countResult.rows[0]?.total || '0') / limit),
    },
  });
});

/**
 * 获取未读通知数量 / Get unread notification count
 * @route GET /api/v1/notifications/unread-count
 * @access Private
 */
export const getUnreadCount = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;

  const result = await queryOne<{ count: number }>(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = FALSE',
    [userId]
  );

  res.json({ success: true, data: { unread_count: parseInt((result as any)?.count || '0') } });
});

/**
 * 标记通知为已读 / Mark notification as read
 * @route PUT /api/v1/notifications/:id/read
 * @access Private
 */
export const markAsRead = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user!.id;

  const result = await query(
    'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE id = $1 AND user_id = $2 AND is_read = FALSE RETURNING id',
    [id, userId]
  );

  await cacheService.delPattern(`notifications:${userId}:*`);

  res.json({
    success: true,
    message: result.rows.length > 0 ? '通知已标记为已读 / Notification marked as read' : '通知已是已读状态 / Notification already read',
  });
});

/**
 * 标记所有通知为已读 / Mark all notifications as read
 * @route PUT /api/v1/notifications/read-all
 * @access Private
 */
export const markAllAsRead = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;

  await query('UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE user_id = $1 AND is_read = FALSE', [userId]);

  await cacheService.delPattern(`notifications:${userId}:*`);

  res.json({ success: true, message: '所有通知已标记为已读 / All notifications marked as read' });
});

/**
 * 删除通知 / Delete notification
 * @route DELETE /api/v1/notifications/:id
 * @access Private
 */
export const deleteNotification = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user!.id;

  await query('DELETE FROM notifications WHERE id = $1 AND user_id = $2', [id, userId]);

  await cacheService.delPattern(`notifications:${userId}:*`);

  res.json({ success: true, message: '通知已删除 / Notification deleted' });
});

export { getNotifications, getUnreadCount, markAsRead, markAllAsRead, deleteNotification };
