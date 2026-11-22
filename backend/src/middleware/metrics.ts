/**
 * Prometheus 指标中间件
 * Prometheus Metrics Middleware
 *
 * @description 收集 HTTP 请求指标，供 Prometheus 采集
 *              Collects HTTP request metrics for Prometheus scraping
 * @module middleware/metrics
 */

import { Request, Response, NextFunction } from 'express';
import client from 'prom-client';

// 创建指标收集器 / Create metric collectors
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status', 'environment'],
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

const activeConnections = new client.Gauge({
  name: 'http_active_connections',
  help: 'Number of active HTTP connections',
});

const databaseConnections = new client.Gauge({
  name: 'database_connections_active',
  help: 'Number of active database connections',
  labelNames: ['database'],
});

// 注册默认指标 / Register default metrics
client.collectDefaultMetrics();

/**
 * 指标中间件 / Metrics middleware
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // 增加活跃连接数 / Increment active connections
  activeConnections.inc();

  // 监听响应完成 / Listen for response completion
  res.on('finish', () => {
    const duration = (Date.now() - startTime) / 1000;
    const route = req.route?.path || req.path || 'unknown';

    // 记录请求指标 / Record request metrics
    httpRequestsTotal.inc({
      method: req.method,
      route,
      status: res.statusCode.toString(),
      environment: process.env.NODE_ENV || 'development',
    });

    httpRequestDuration.observe(
      { method: req.method, route, status: res.statusCode.toString() },
      duration
    );

    activeConnections.dec();
  });

  next();
}

/**
 * 指标路由 / Metrics route
 */
export function metricsRoute(req: Request, res: Response): void {
  res.set('Content-Type', client.register.contentType);
  res.end(client.register.metrics());
}
