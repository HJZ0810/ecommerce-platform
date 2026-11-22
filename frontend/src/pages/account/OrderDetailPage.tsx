/**
 * 订单详情页 / Order Detail Page
 * @description 展示订单详细信息、商品列表、状态历史、物流追踪
 * @module pages/account/OrderDetailPage
 */

import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: '待支付', payment_received: '已支付', confirmed: '已确认',
  processing: '处理中', shipped: '已发货', delivered: '已送达',
  completed: '已完成', cancelled: '已取消', refunded: '已退款',
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api.get(`/orders/${id}`),
    enabled: !!id,
  });

  const order = data?.data;

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-32 bg-gray-200 rounded" />
          <div className="h-48 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900">订单不存在 / Order not found</h2>
        <Link to="/orders" className="btn-primary mt-4 inline-block">返回订单列表 / Back to Orders</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/orders" className="hover:text-primary-600">我的订单 / Orders</Link>
        <span>/</span>
        <span className="text-gray-900">{order.order_number}</span>
      </nav>

      {/* Order header / 订单头部 */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{order.order_number}</h1>
            <p className="text-sm text-gray-500 mt-1">下单时间: {new Date(order.created_at).toLocaleString('zh-CN')}</p>
          </div>
          <span className="px-4 py-2 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
            {ORDER_STATUS_LABELS[order.order_status] || order.order_status}
          </span>
        </div>
      </div>

      {/* Order items / 订单商品 */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">商品列表 / Order Items</h2>
        <div className="space-y-4">
          {order.items?.map((item: any) => (
            <div key={item.id} className="flex gap-4 pb-4 border-b last:border-0 last:pb-0">
              <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                {item.product_image && <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{item.product_name}</p>
                <p className="text-sm text-gray-500">x{item.quantity}</p>
                <p className="text-red-600 font-semibold">¥{Number(item.subtotal).toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Order summary / 订单摘要 */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">订单金额 / Order Total</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-600">商品小计</span><span>¥{Number(order.subtotal_amount).toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-gray-600">运费</span><span>¥{Number(order.shipping_amount).toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-gray-600">税费</span><span>¥{Number(order.tax_amount).toFixed(2)}</span></div>
          {order.discount_amount > 0 && (
            <div className="flex justify-between text-green-600"><span>优惠折扣</span><span>-¥{Number(order.discount_amount).toFixed(2)}</span></div>
          )}
          <div className="border-t pt-2 flex justify-between text-lg font-bold">
            <span>总计</span>
            <span className="text-red-600">¥{Number(order.total_amount).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Shipping address / 收货地址 */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">收货地址 / Shipping Address</h2>
        {order.shipping_address && (
          <div className="text-sm text-gray-600">
            <p>{order.shipping_address.recipient_name} {order.shipping_address.recipient_phone}</p>
            <p>{order.shipping_address.province} {order.shipping_address.city} {order.shipping_address.district}</p>
            <p>{order.shipping_address.street_address}</p>
          </div>
        )}
      </div>

      {/* Status history / 状态历史 */}
      {order.status_history && order.status_history.length > 0 && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">订单状态 / Order Status</h2>
          <div className="space-y-3">
            {order.status_history.map((history: any) => (
              <div key={history.id} className="flex items-center gap-4 text-sm">
                <span className="px-2 py-1 bg-gray-100 rounded">{history.to_status}</span>
                <span className="text-gray-500">{new Date(history.created_at).toLocaleString('zh-CN')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
