/**
 * 登录页 / Login Page
 * @description 用户登录表单，支持邮箱/手机号登录
 * @module pages/auth/LoginPage
 */

import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuthStore();
  const [formData, setFormData] = useState({ email_or_phone: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loginMutation = useMutation({
    mutationFn: (data: any) => api.post('/auth/login', data),
    onSuccess: (response) => {
      const { access_token, refresh_token, user } = response.data.data;
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      setUser(user as any);
      toast.success('登录成功 / Login successful');
      navigate(location.state?.from || '/');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error_zh || '登录失败 / Login failed');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!formData.email_or_phone) newErrors.email_or_phone = '请输入邮箱或手机号';
    if (!formData.password) newErrors.password = '请输入密码';
    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) loginMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">E</span>
            </div>
          </Link>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">登录 / Login</h2>
          <p className="mt-2 text-sm text-gray-600">
            还没有账号？<Link to="/register" className="text-primary-600 hover:underline">立即注册 / Register</Link>
          </p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">邮箱或手机号 / Email or Phone</label>
              <input
                type="text"
                value={formData.email_or_phone}
                onChange={(e) => setFormData({ ...formData, email_or_phone: e.target.value })}
                className={`input-field ${errors.email_or_phone ? 'border-red-500' : ''}`}
                placeholder="your@email.com or phone"
              />
              {errors.email_or_phone && <p className="text-red-500 text-sm mt-1">{errors.email_or_phone}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">密码 / Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className={`input-field ${errors.password ? 'border-red-500' : ''}`}
                placeholder="••••••••"
              />
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded border-gray-300" />
                <span className="text-sm text-gray-600">记住我 / Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-sm text-primary-600 hover:underline">忘记密码？/ Forgot?</Link>
            </div>

            <button type="submit" disabled={loginMutation.isPending} className="btn-primary w-full py-3">
              {loginMutation.isPending ? '登录中... / Logging in...' : '登录 / Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
