/**
 * 通知服务
 * Notification Service
 *
 * @description 处理邮件通知、短信通知、推送通知的发送
 *              Handles email, SMS, and push notification sending
 * @module services/notification
 */

import nodemailer from 'nodemailer';
import { query, queryOne } from '@/config/database.js';
import { cacheService } from '@/config/redis.js';
import { logger } from '@/utils/logger.js';

/**
 * Nodemailer 传输器配置
 */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

/**
 * 发送验证邮件
 * Send email verification email
 *
 * @param {string} email - 收件人邮箱
 * @param {string} token - 验证令牌
 * @param {string} [name] - 用户名称
 */
export async function sendVerificationEmail(
  email: string,
  token: string,
  name?: string
): Promise<void> {
  const verificationUrl = `${process.env.SITE_URL}/verify-email?token=${token}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>欢迎加入我们！</h2>
      <p>亲爱的 ${name || '用户'}，</p>
      <p>感谢您的注册。请点击以下链接验证您的邮箱：</p>
      <p><a href="${verificationUrl}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">验证邮箱</a></p>
      <p>或者复制以下链接到浏览器：</p>
      <p>${verificationUrl}</p>
      <p>此链接将在 24 小时后过期。</p>
      <hr>
      <p style="color: #666; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@example.com',
      to: email,
      subject: '请验证您的邮箱',
      html,
    });
    logger.info(`Verification email sent to: ${email}`);
  } catch (error) {
    logger.error(`Failed to send verification email to ${email}:`, error);
    throw error;
  }
}

/**
 * 发送订单确认邮件
 * Send order confirmation email
 */
export async function sendOrderConfirmationEmail(
  email: string,
  orderNumber: string,
  customerName?: string
): Promise<void> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>订单确认</h2>
      <p>亲爱的 ${customerName || '客户'}，</p>
      <p>感谢您的购买！您的订单已确认。</p>
      <h3>订单号：${orderNumber}</h3>
      <p>我们将尽快为您发货。</p>
      <p>您可以在"我的订单"中查看订单状态。</p>
      <hr>
      <p style="color: #666; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@example.com',
      to: email,
      subject: `订单确认 - ${orderNumber}`,
      html,
    });
    logger.info(`Order confirmation email sent to: ${email}`);
  } catch (error) {
    logger.error(`Failed to send order confirmation email:`, error);
    throw error;
  }
}

/**
 * 发送通知（通用方法）
 * Send notification (generic)
 */
export async function sendNotification(
  userId: string,
  type: 'email' | 'sms' | 'push',
  subject: string,
  content: string
): Promise<void> {
  // 保存到数据库 / Save to database
  await query(
    `INSERT INTO notifications (user_id, notification_type, title, content, sent_via_channel, sent_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [userId, 'system', subject, content, type]
  );

  // 使通知缓存失效 / Invalidate notification cache
  await cacheService.delPattern(`notifications:${userId}:*`);

  // 根据类型发送 / Send based on type
  switch (type) {
    case 'email': {
      const user = await queryOne('SELECT email FROM users WHERE id = $1', [userId]);
      if (user) {
        await transporter.sendMail({
          from: process.env.SMTP_FROM,
          to: (user as any).email,
          subject,
          text: content,
        });
      }
      break;
    }
    case 'sms':
      // TODO: 集成短信服务 / Integrate SMS service
      logger.info(`SMS notification for user ${userId}: ${subject}`);
      break;
    case 'push':
      // TODO: 集成推送服务 / Integrate push service
      logger.info(`Push notification for user ${userId}: ${subject}`);
      break;
  }
}

export { transporter };
