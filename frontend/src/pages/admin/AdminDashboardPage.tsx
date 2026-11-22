/**
 * 管理后台仪表盘页 / Admin Dashboard Page
 * @description 展示业务统计数据、快捷入口
 * @module pages/admin/AdminDashboardPage
 */

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';

export default function AdminDashboardPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  if (!isAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900">权限不足 / Access Denied</h2>
        <p className="text-gray-500 mt-2">您没有权限访问管理后台</p>
      </div>
    );
  }

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.get('/admin/dashboard'),
  });

  const stats = dashboardData?.data;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">管理后台 / Admin Dashboard</h1>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-6 animate-pulse"><div className="h-8 bg-gray-200 rounded w-1/2" /></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { label: '总用户 / Users', value: stats?.overview?.total_users, color: 'blue' },
            { label: '总订单 / Orders', value: stats?.overview?.total_orders, color: 'green' },
            { label: '总商品 / Products', value: stats?.overview?.total_products, color: 'purple' },
            { label: '总收入 / Revenue', value: `¥${stats?.overview?.total_revenue?.toFixed(2)}`, color: 'red' },
          ].map((stat) => (
            <div key={stat.label} className="card p-6">
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: '商品管理 / Products', to: '/admin/products', icon: '📦' },
          { label: '订单管理 / Orders', to: '/admin/orders', icon: '📋' },
          { label: '库存管理 / Inventory', to: '/admin/inventory', icon: '🏭' },
          { label: '报表分析 / Reports', to: '/admin/reports', icon: '📊' },
        ].map((link) => (
          <Link key={link.to} to={link.to} className="card p-6 text-center hover:shadow-md transition-shadow">
            <div className="text-3xl mb-2">{link.icon}</div>
            <p className="font-medium text-sm">{link.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
