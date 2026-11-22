/**
 * 订单管理页 / Admin Orders Page
 * @module pages/admin/AdminOrdersPage
 */
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/services/api';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700', confirmed: 'bg-green-100 text-green-700',
  shipped: 'bg-blue-100 text-blue-700', completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-700', refunded: 'bg-red-100 text-red-700',
};

export default function AdminOrdersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => api.get('/orders/admin/all?limit=50'),
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">订单管理 / Order Management</h1>
      {isLoading ? (
        <div className="space-y-4">{Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="card p-4 animate-pulse"><div className="h-5 bg-gray-200 rounded w-1/2" /></div>
        ))}</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">订单号 / Order</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">用户 / User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">金额 / Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态 / Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">时间 / Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data?.data?.map((order: any) => (
                <tr key={order.id}>
                  <td className="px-6 py-4 text-sm font-mono">{order.order_number}</td>
                  <td className="px-6 py-4 text-sm">{order.email || order.user_id?.substring(0, 8)}</td>
                  <td className="px-6 py-4 text-sm font-semibold">¥{Number(order.total_amount).toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className={`badge ${STATUS_COLORS[order.order_status] || 'bg-gray-100'}`}>{order.order_status}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString('zh-CN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
