/**
 * 我的订单页 / Orders Page
 * @description 展示用户订单列表，支持状态筛选
 * @module pages/account/OrdersPage
 */

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { api } from '@/services/api';

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: '待支付 / Pending',
  payment_received: '已支付 / Paid',
  confirmed: '已确认 / Confirmed',
  processing: '处理中 / Processing',
  shipped: '已发货 / Shipped',
  delivered: '已送达 / Delivered',
  completed: '已完成 / Completed',
  cancelled: '已取消 / Cancelled',
  refunded: '已退款 / Refunded',
};

const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  payment_received: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-green-100 text-green-700',
  processing: 'bg-purple-100 text-purple-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-teal-100 text-teal-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-700',
  refunded: 'bg-red-100 text-red-700',
};

export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['orders', statusFilter],
    queryFn: () => api.get(`/orders?${statusFilter ? `status=${statusFilter}&` : ''}limit=20`),
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">我的订单 / My Orders</h1>

      {/* Status filter / 状态筛选 */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <button onClick={() => setStatusFilter('')} className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap ${!statusFilter ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
          全部 / All
        </button>
        {Object.entries(ORDER_STATUS_LABELS).map(([key, label]) => (
          <button key={key} onClick={() => setStatusFilter(key)} className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap ${statusFilter === key ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">{Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="card p-6 animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-1/4 mb-4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        ))}</div>
      ) : data?.data?.length > 0 ? (
        <div className="space-y-4">
          {data.data.map((order: any) => (
            <Link key={order.id} to={`/orders/${order.id}`} className="card p-6 block hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-mono text-sm text-gray-500">{order.order_number}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(order.created_at).toLocaleString('zh-CN')}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${ORDER_STATUS_COLORS[order.order_status] || 'bg-gray-100'}`}>
                  {ORDER_STATUS_LABELS[order.order_status] || order.order_status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">订单金额 / Amount</p>
                <p className="font-bold text-lg text-red-600">¥{Number(order.total_amount).toFixed(2)}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📋</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">暂无订单 / No orders yet</h2>
          <p className="text-gray-500 mb-6">快去挑选心仪的商品吧！</p>
          <Link to="/products" className="btn-primary">去购物 / Start Shopping</Link>
        </div>
      )}
    </div>
  );
}
