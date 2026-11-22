/**
 * 电商平台后端 - 主服务器入口
 * E-commerce Platform Backend - Main Server Entry Point
 *
 * @description 初始化 Express 服务器，配置中间件、路由、健康检查
 * @module server
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';

// Import configuration and middleware
import { connectDatabase } from '@/config/database.js';
import { connectRedis } from '@/config/redis.js';
import { connectElasticsearch } from '@/config/elasticsearch.js';
import { errorHandler } from '@/middleware/errorHandler.js';
import { logger } from '@/utils/logger.js';
import { metricsMiddleware } from '@/middleware/metrics.js';

// Import routes
import authRoutes from '@/routes/authRoutes.js';
import userRoutes from '@/routes/userRoutes.js';
import productRoutes from '@/routes/productRoutes.js';
import categoryRoutes from '@/routes/categoryRoutes.js';
import brandRoutes from '@/routes/brandRoutes.js';
import reviewRoutes from '@/routes/reviewRoutes.js';
import cartRoutes from '@/routes/cartRoutes.js';
import orderRoutes from '@/routes/orderRoutes.js';
import paymentRoutes from '@/routes/paymentRoutes.js';
import couponRoutes from '@/routes/couponRoutes.js';
import wishlistRoutes from '@/routes/wishlistRoutes.js';
import notificationRoutes from '@/routes/notificationRoutes.js';
import searchRoutes from '@/routes/searchRoutes.js';
import uploadRoutes from '@/routes/uploadRoutes.js';
import adminRoutes from '@/routes/adminRoutes.js';
import reportRoutes from '@/routes/reportRoutes.js';
import inventoryRoutes from '@/routes/inventoryRoutes.js';
import shippingRoutes from '@/routes/shippingRoutes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Initialize middleware
 * 初始化中间件
 */
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true,
}));
app.use(compression()); // Response compression
app.use(express.json({ limit: '10mb' })); // Body parser
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
app.use(metricsMiddleware); // Prometheus metrics

// Health check endpoint - 健康检查接口
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'ecommerce-backend',
    version: '1.0.0',
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Health check with dependencies - 依赖健康检查
app.get('/health/detailed', async (req, res) => {
  try {
    const [dbStatus, redisStatus, esStatus] = await Promise.allSettled([
      checkDatabase(),
      checkRedis(),
      checkElasticsearch(),
    ]);

    const health = {
      status: 'healthy',
      service: 'ecommerce-backend',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      dependencies: {
        database: dbStatus.status === 'fulfilled' ? 'healthy' : 'unhealthy',
        redis: redisStatus.status === 'fulfilled' ? 'healthy' : 'unhealthy',
        elasticsearch: esStatus.status === 'fulfilled' ? 'healthy' : 'unhealthy',
      },
    };

    const allHealthy = Object.values(health.dependencies).every(s => s === 'healthy');
    res.status(allHealthy ? 200 : 503).json(health);
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

// Metrics endpoint (Prometheus)
import { metricsRoute } from '@/middleware/metrics.js';
app.get('/metrics', metricsRoute);

// API routes - API 路由
const API_PREFIX = process.env.API_PREFIX || '/api/v1';

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/products`, productRoutes);
app.use(`${API_PREFIX}/categories`, categoryRoutes);
app.use(`${API_PREFIX}/brands`, brandRoutes);
app.use(`${API_PREFIX}/reviews`, reviewRoutes);
app.use(`${API_PREFIX}/cart`, cartRoutes);
app.use(`${API_PREFIX}/orders`, orderRoutes);
app.use(`${API_PREFIX}/payments`, paymentRoutes);
app.use(`${API_PREFIX}/coupons`, couponRoutes);
app.use(`${API_PREFIX}/wishlist`, wishlistRoutes);
app.use(`${API_PREFIX}/notifications`, notificationRoutes);
app.use(`${API_PREFIX}/search`, searchRoutes);
app.use(`${API_PREFIX}/upload`, uploadRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);
app.use(`${API_PREFIX}/reports`, reportRoutes);
app.use(`${API_PREFIX}/inventory`, inventoryRoutes);
app.use(`${API_PREFIX}/shipping`, shippingRoutes);

// Swagger documentation (development only)
if (NODE_ENV !== 'production') {
  const swaggerJsDoc = (await import('swagger-jsdoc')).default;
  const swaggerUi = (await import('swagger-ui-express')).default;

  const options = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'E-commerce API',
        version: '1.0.0',
        description: 'Full-stack e-commerce platform REST API',
      },
      servers: [{ url: `http://localhost:${PORT}${API_PREFIX}` }],
    },
    apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
  };

  const specs = swaggerJsDoc(options);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
}

// 404 handler - 404 处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    message_zh: `路由 ${req.originalUrl} 未找到`,
  });
});

// Error handler (must be last) - 全局错误处理（必须放在最后）
app.use(errorHandler);

// Dependency health check helpers - 依赖健康检查辅助函数
async function checkDatabase() {
  const { query } = await import('@/config/database.js');
  await query('SELECT 1');
  return true;
}

async function checkRedis() {
  const redis = await import('@/config/redis.js');
  await redis.default.ping();
  return true;
}

async function checkElasticsearch() {
  const es = await import('@/config/elasticsearch.js');
  const client = es.default;
  const health = await client.cluster.health();
  return health.status === 'green' || health.status === 'yellow';
}

// Graceful shutdown handler - 优雅关闭处理
async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}, starting graceful shutdown...`);
  logger.info(`收到 ${signal}，开始优雅关闭...`);

  server.close(() => {
    logger.info('HTTP server closed');
  });

  try {
    // Close database connections
    const { disconnectDatabase } = await import('@/config/database.js');
    await disconnectDatabase();

    // Close Redis connections
    const { disconnectRedis } = await import('@/config/redis.js');
    await disconnectRedis();

    // Close Elasticsearch connections
    const { disconnectElasticsearch } = await import('@/config/elasticsearch.js');
    await disconnectElasticsearch();

    logger.info('All connections closed. Exiting...');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start server - 启动服务器
async function startServer() {
  try {
    // Connect to all services - 连接所有服务
    await connectDatabase();
    logger.info('✅ Database connected successfully');
    logger.info('✅ 数据库连接成功');

    await connectRedis();
    logger.info('✅ Redis connected successfully');
    logger.info('✅ Redis 连接成功');

    await connectElasticsearch();
    logger.info('✅ Elasticsearch connected successfully');
    logger.info('✅ Elasticsearch 连接成功');

    // Start HTTP server - 启动 HTTP 服务器
    const server = createServer(app);
    server.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT} in ${NODE_ENV} mode`);
      logger.info(`📋 API Documentation: http://localhost:${PORT}/api-docs`);
      logger.info(`💚 Health Check: http://localhost:${PORT}/health`);
      logger.info(`📊 Metrics: http://localhost:${PORT}/metrics`);
      logger.info(`🚀 服务器运行在端口 ${PORT}，模式：${NODE_ENV}`);
    });

    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Only start if this is the main module
// 仅在为主模块时启动
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export { app };
