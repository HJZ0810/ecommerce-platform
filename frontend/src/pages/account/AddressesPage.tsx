/**
 * 地址管理页 / Addresses Page
 * @description 管理用户收货地址
 * @module pages/account/AddressesPage
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { api } from '@/services/api';

export default function AddressesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    label: 'home', recipient_name: '', recipient_phone: '',
    province: '', city: '', district: '', street_address: '', postal_code: '', is_default: false,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => api.get('/users/me/addresses'),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/users/me/addresses', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      toast.success('地址添加成功 / Address added');
      setShowForm(false);
      setFormData({ label: 'home', recipient_name: '', recipient_phone: '', province: '', city: '', district: '', street_address: '', postal_code: '', is_default: false });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/me/addresses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      toast.success('地址已删除 / Address deleted');
    },
  });

  const addresses = data?.data || [];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">地址管理 / Addresses</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? '取消 / Cancel' : '添加地址 / Add Address'}
        </button>
      </div>

      {/* Add form / 添加表单 */}
      {showForm && (
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">新增地址 / New Address</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input className="input-field" placeholder="收件人 / Recipient" value={formData.recipient_name} onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })} />
            <input className="input-field" placeholder="电话 / Phone" value={formData.recipient_phone} onChange={(e) => setFormData({ ...formData, recipient_phone: e.target.value })} />
            <input className="input-field" placeholder="省份 / Province" value={formData.province} onChange={(e) => setFormData({ ...formData, province: e.target.value })} />
            <input className="input-field" placeholder="城市 / City" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
            <input className="input-field" placeholder="区县 / District" value={formData.district} onChange={(e) => setFormData({ ...formData, district: e.target.value })} />
            <input className="input-field md:col-span-2" placeholder="详细地址 / Street Address" value={formData.street_address} onChange={(e) => setFormData({ ...formData, street_address: e.target.value })} />
            <button onClick={() => createMutation.mutate(formData)} disabled={createMutation.isPending} className="btn-primary">
              {createMutation.isPending ? '保存中...' : '保存 / Save'}
            </button>
          </div>
        </div>
      )}

      {/* Address list / 地址列表 */}
      {isLoading ? (
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card p-6 animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-1/3" />
          </div>
        ))}</div>
      ) : addresses.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500">暂无地址 / No addresses</p>
        </div>
      ) : (
        <div className="space-y-4">
          {addresses.map((addr: any) => (
            <div key={addr.id} className="card p-6 flex items-start justify-between">
              <div>
                <p className="font-medium">{addr.recipient_name} {addr.recipient_phone}</p>
                <p className="text-sm text-gray-600 mt-1">{addr.province} {addr.city} {addr.district} {addr.street_address}</p>
                {addr.is_default && <span className="badge bg-primary-100 text-primary-700 mt-2">默认 / Default</span>}
              </div>
              <button onClick={() => deleteMutation.mutate(addr.id)} className="text-gray-400 hover:text-red-500 ml-4">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
