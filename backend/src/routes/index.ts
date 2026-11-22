/**
 * 路由索引 / Routes Index
 * @description 集中导出所有路由模块
 * @module routes/index
 */

import { Router } from 'express';

import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import productRoutes from './productRoutes.js';
import categoryRoutes from './categoryRoutes.js';
import brandRoutes from './brandRoutes.js';
import reviewRoutes from './reviewRoutes.js';
import cartRoutes from './cartRoutes.js';
import orderRoutes from './orderRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import couponRoutes from './couponRoutes.js';
import wishlistRoutes from './wishlistRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import searchRoutes from './searchRoutes.js';
import uploadRoutes from './uploadRoutes.js';
import adminRoutes from './adminRoutes.js';
import reportRoutes from './reportRoutes.js';
import inventoryRoutes from './inventoryRoutes.js';
import shippingRoutes from './shippingRoutes.js';

/**
 * 注册所有路由 / Register all routes
 * @param {Router} app - Express 应用实例
 */
export function registerRoutes(app: Router): void {
  app.use('/auth', authRoutes);
  app.use('/users', userRoutes);
  app.use('/products', productRoutes);
  app.use('/categories', categoryRoutes);
  app.use('/brands', brandRoutes);
  app.use('/reviews', reviewRoutes);
  app.use('/cart', cartRoutes);
  app.use('/orders', orderRoutes);
  app.use('/payments', paymentRoutes);
  app.use('/coupons', couponRoutes);
  app.use('/wishlist', wishlistRoutes);
  app.use('/notifications', notificationRoutes);
  app.use('/search', searchRoutes);
  app.use('/upload', uploadRoutes);
  app.use('/admin', adminRoutes);
  app.use('/reports', reportRoutes);
  app.use('/inventory', inventoryRoutes);
  app.use('/shipping', shippingRoutes);
}
