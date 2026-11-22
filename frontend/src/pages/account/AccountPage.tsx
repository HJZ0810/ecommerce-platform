/**
 * 个人中心页 / Account Page
 * @description 展示和编辑用户个人资料
 * @module pages/account/AccountPage
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';

export default function AccountPage() {
  const queryClient = useQueryClient();
  const { user, updateUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    display_name: '',
    gender: '',
    birthday: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['user', 'me'],
    queryFn: () => api.get('/users/me'),
  });

  const currentUser = data?.data?.user || user;

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put('/users/me', data),
    onSuccess: (response) => {
      updateUser(response.data.data.user);
      queryClient.invalidateQueries({ queryKey: ['user'] });
      toast.success('资料更新成功 / Profile updated');
      setIsEditing(false);
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4" />
          <div className="h-32 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">个人中心 / My Account</h1>

      {/* Profile card / 个人资料卡片 */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">个人资料 / Profile</h2>
          <button
            onClick={() => {
              if (isEditing) handleSave();
              else {
                setFormData({
                  first_name: currentUser?.first_name || '',
                  last_name: currentUser?.last_name || '',
                  display_name: currentUser?.display_name || '',
                  gender: currentUser?.gender || '',
                  birthday: currentUser?.birthday || '',
                });
                setIsEditing(true);
              }
            }}
            className="btn-primary"
          >
            {isEditing ? '保存 / Save' : '编辑 / Edit'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Avatar / 头像 */}
          <div className="md:col-span-2 flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-3xl font-bold text-primary-600">
                {(currentUser?.first_name?.[0] || currentUser?.email?.[0] || 'U').toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-semibold text-lg">{currentUser?.display_name || currentUser?.first_name || 'User'}</p>
              <p className="text-sm text-gray-500">{currentUser?.email}</p>
            </div>
          </div>

          {/* First name / 名字 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">名字 / First Name</label>
            {isEditing ? (
              <input type="text" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} className="input-field" />
            ) : (
              <p className="text-gray-900">{currentUser?.first_name || '-'}</p>
            )}
          </div>

          {/* Last name / 姓氏 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">姓氏 / Last Name</label>
            {isEditing ? (
              <input type="text" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} className="input-field" />
            ) : (
              <p className="text-gray-900">{currentUser?.last_name || '-'}</p>
            )}
          </div>

          {/* Phone / 手机号 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">手机号 / Phone</label>
            <p className="text-gray-900">{currentUser?.phone || '未绑定 / Not set'}</p>
          </div>

          {/* Gender / 性别 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">性别 / Gender</label>
            {isEditing ? (
              <select value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })} className="input-field">
                <option value="">请选择 / Select</option>
                <option value="male">男 / Male</option>
                <option value="female">女 / Female</option>
                <option value="other">其他 / Other</option>
              </select>
            ) : (
              <p className="text-gray-900">{currentUser?.gender === 'male' ? '男 / Male' : currentUser?.gender === 'female' ? '女 / Female' : '-'}</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick links / 快捷链接 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link to="/orders" className="card p-6 text-center hover:shadow-md transition-shadow">
          <div className="text-3xl mb-2">📋</div>
          <p className="font-medium">我的订单 / Orders</p>
        </Link>
        <Link to="/addresses" className="card p-6 text-center hover:shadow-md transition-shadow">
          <div className="text-3xl mb-2">📍</div>
          <p className="font-medium">地址管理 / Addresses</p>
        </Link>
        <Link to="/wishlist" className="card p-6 text-center hover:shadow-md transition-shadow">
          <div className="text-3xl mb-2">❤️</div>
          <p className="font-medium">我的收藏 / Wishlist</p>
        </Link>
        <Link to="/notifications" className="card p-6 text-center hover:shadow-md transition-shadow">
          <div className="text-3xl mb-2">🔔</div>
          <p className="font-medium">通知中心 / Notifications</p>
        </Link>
      </div>
    </div>
  );
}
