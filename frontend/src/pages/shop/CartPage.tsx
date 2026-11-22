/**
 * 购物车页 / Cart Page
 * @description 展示购物车商品列表、数量调整、总价计算、去结算
 * @module pages/shop/CartPage
 */

import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { api } from '@/services/api';
import { useCartStore } from '@/store/cartStore';

export default function CartPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['cart'],
    queryFn: () => api.get('/cart'),
  });

  const removeMutation = useMutation({
    mutationFn: (itemId: string) => api.delete(`/cart/items/${itemId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success('已移除 / Removed');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      api.put(`/cart/items/${itemId}`, { quantity }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const cart = data?.data;
  const items = cart?.items || [];

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">购物车 / Shopping Cart</h1>
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card p-6 flex gap-6 animate-pulse">
            <div className="w-24 h-24 bg-gray-200 rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-gray-200 rounded w-1/2" />
              <div className="h-4 bg-gray-200 rounded w-1/4" />
            </div>
          </div>
        ))}</div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="text-6xl mb-4">🛒</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">购物车为空 / Your cart is empty</h2>
        <p className="text-gray-500 mb-8">快去挑选心仪的商品吧！</p>
        <Link to="/products" className="btn-primary">去购物 / Start Shopping</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">购物车 / Shopping Cart ({items.length})</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item: any) => (
            <div key={item.id} className="card p-6 flex gap-6">
              {/* Product image / 商品图片 */}
              <Link to={`/products/${item.product_id}`} className="flex-shrink-0">
                <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden">
                  <img src={item.image || '/images/placeholder.jpg'} alt={item.name} className="w-full h-full object-cover" />
                </div>
              </Link>

              {/* Product info / 商品信息 */}
              <div className="flex-1 min-w-0">
                <Link to={`/products/${item.product_id}`} className="font-medium text-gray-900 hover:text-primary-600 line-clamp-2">
                  {item.name}
                </Link>
                <p className="text-red-600 font-semibold mt-1">¥{Number(item.unit_price).toFixed(2)}</p>

                {/* Quantity controls / 数量控制 */}
                <div className="flex items-center gap-3 mt-3">
                  <button
                    onClick={() => updateMutation.mutate({ itemId: item.id, quantity: Math.max(1, parseInt(item.quantity) - 1) })}
                    className="w-8 h-8 border border-gray-300 rounded flex items-center justify-center hover:bg-gray-50"
                  >
                    -
                  </button>
                  <span className="font-medium w-8 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateMutation.mutate({ itemId: item.id, quantity: parseInt(item.quantity) + 1 })}
                    className="w-8 h-8 border border-gray-300 rounded flex items-center justify-center hover:bg-gray-50"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Subtotal and remove / 小计和删除 */}
              <div className="flex flex-col items-end justify-between">
                <button
                  onClick={() => removeMutation.mutate(item.id)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                <p className="font-bold text-gray-900">¥{Number(item.subtotal).toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Order summary / 订单摘要 */}
        <div className="lg:col-span-1">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">订单摘要 / Order Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">商品小计 / Subtotal</span>
                <span className="font-medium">¥{Number(cart.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">运费 / Shipping</span>
                <span className="font-medium">计算于结算时 / Calculated at checkout</span>
              </div>
              <div className="border-t pt-3 flex justify-between">
                <span className="font-semibold">总计 / Total</span>
                <span className="font-bold text-lg text-red-600">¥{Number(cart.subtotal).toFixed(2)}</span>
              </div>
            </div>
            <Link to="/checkout" className="btn-primary w-full mt-6 text-center block">
              去结算 / Checkout
            </Link>
            <Link to="/products" className="btn-secondary w-full mt-3 text-center block">
              继续购物 / Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
