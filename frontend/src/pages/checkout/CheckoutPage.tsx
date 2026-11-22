/**
 * 结算页 / Checkout Page
 * @description 选择地址、配送方式、支付方式，确认订单
 * @module pages/checkout/CheckoutPage
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { api } from '@/services/api';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [selectedShippingId, setSelectedShippingId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('alipay');
  const [couponCode, setCouponCode] = useState('');

  const { data: cartData } = useQuery({
    queryKey: ['cart'],
    queryFn: () => api.get('/cart'),
  });

  const { data: addressesData } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => api.get('/users/me/addresses'),
  });

  const { data: shippingData } = useQuery({
    queryKey: ['shipping-methods'],
    queryFn: () => api.get('/shipping/methods'),
  });

  const createOrderMutation = useMutation({
    mutationFn: (data: any) => api.post('/orders', data),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success('订单创建成功 / Order created');
      navigate(`/orders/${response.data.data.order_id}`);
    },
    onError: () => {
      toast.error('订单创建失败 / Failed to create order');
    },
  });

  const cart = cartData?.data;
  const addresses = addressesData?.data || [];
  const shippingMethods = shippingData?.data || [];
  const subtotal = cart?.subtotal || 0;
  const shippingCost = selectedShippingId ? (shippingMethods.find((s: any) => s.id === selectedShippingId)?.base_price || 0) : 0;

  const handleSubmit = () => {
    if (!selectedAddressId) {
      toast.error('请选择收货地址 / Please select shipping address');
      return;
    }
    if (!selectedShippingId) {
      toast.error('请选择配送方式 / Please select shipping method');
      return;
    }

    createOrderMutation.mutate({
      shipping_address_id: selectedAddressId,
      payment_method: paymentMethod,
      shipping_method_id: selectedShippingId,
      coupon_code: couponCode || undefined,
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">结算 / Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Address selection */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4">收货地址 / Shipping Address</h2>
            {addresses.length === 0 ? (
              <p className="text-gray-500">暂无地址，请先添加 / No addresses</p>
            ) : (
              <div className="space-y-3">
                {addresses.map((addr: any) => (
                  <label key={addr.id} className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer ${selectedAddressId === addr.id ? 'border-primary-600 bg-primary-50' : 'border-gray-200'}`}>
                    <input type="radio" name="address" value={addr.id} checked={selectedAddressId === addr.id} onChange={(e) => setSelectedAddressId(e.target.value)} />
                    <div>
                      <p className="font-medium">{addr.recipient_name} {addr.recipient_phone}</p>
                      <p className="text-sm text-gray-600">{addr.province} {addr.city} {addr.district} {addr.street_address}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Shipping method */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4">配送方式 / Shipping Method</h2>
            <div className="space-y-3">
              {shippingMethods.map((method: any) => (
                <label key={method.id} className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer ${selectedShippingId === method.id ? 'border-primary-600 bg-primary-50' : 'border-gray-200'}`}>
                  <div className="flex items-center gap-3">
                    <input type="radio" name="shipping" value={method.id} checked={selectedShippingId === method.id} onChange={(e) => setSelectedShippingId(e.target.value)} />
                    <div>
                      <p className="font-medium">{method.name}</p>
                      <p className="text-sm text-gray-500">{method.carrier} - {method.estimated_days_min}-{method.estimated_days_max} 天</p>
                    </div>
                  </div>
                  <span className="font-semibold">¥{Number(method.base_price).toFixed(2)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Payment method */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4">支付方式 / Payment Method</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'alipay', name: '支付宝', icon: 'Alipay' },
                { id: 'wechat_pay', name: '微信支付', icon: 'WeChat' },
                { id: 'credit_card', name: '信用卡', icon: 'Card' },
                { id: 'bank_transfer', name: '银行转账', icon: 'Bank' },
              ].map((method) => (
                <label key={method.id} className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer ${paymentMethod === method.id ? 'border-primary-600 bg-primary-50' : 'border-gray-200'}`}>
                  <input type="radio" name="payment" value={method.id} checked={paymentMethod === method.id} onChange={(e) => setPaymentMethod(e.target.value)} />
                  <span>{method.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Coupon */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4">优惠券 / Coupon</h2>
            <div className="flex gap-3">
              <input type="text" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="输入优惠券代码" className="input-field flex-1" />
              <button className="btn-secondary">应用 / Apply</button>
            </div>
          </div>
        </div>

        {/* Order summary */}
        <div className="lg:col-span-1">
          <div className="card p-6 sticky top-24">
            <h3 className="text-lg font-semibold mb-4">订单摘要 / Order Summary</h3>
            <div className="space-y-3 text-sm mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">小计 / Subtotal</span>
                <span>¥{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">运费 / Shipping</span>
                <span>¥{shippingCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">税费 / Tax (6%)</span>
                <span>¥{(subtotal * 0.06).toFixed(2)}</span>
              </div>
              <div className="border-t pt-3 flex justify-between text-lg">
                <span className="font-semibold">总计 / Total</span>
                <span className="font-bold text-red-600">¥{(subtotal + shippingCost + subtotal * 0.06).toFixed(2)}</span>
              </div>
            </div>
            <button onClick={handleSubmit} disabled={createOrderMutation.isPending} className="btn-primary w-full py-3">
              {createOrderMutation.isPending ? '处理中...' : '提交订单 / Place Order'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
