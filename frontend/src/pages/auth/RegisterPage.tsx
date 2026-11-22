/**
 * 注册页 / Register Page
 * @description 用户注册表单
 * @module pages/auth/RegisterPage
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const [formData, setFormData] = useState({
    email: '', password: '', confirm_password: '',
    first_name: '', last_name: '', phone: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const registerMutation = useMutation({
    mutationFn: (data: any) => api.post('/auth/register', data),
    onSuccess: (response) => {
      toast.success('注册成功！请查收验证邮件 / Registration successful! Check your email.');
      navigate('/login');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error_zh || '注册失败 / Registration failed');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!formData.email) newErrors.email = '请输入邮箱';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = '邮箱格式不正确';
    if (!formData.password || formData.password.length < 8) newErrors.password = '密码至少8位';
    if (formData.password !== formData.confirm_password) newErrors.confirm_password = '两次密码不一致';
    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      const { confirm_password, ...registerData } = formData;
      registerMutation.mutate(registerData);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">注册 / Register</h2>
          <p className="mt-2 text-sm text-gray-600">
            已有账号？<Link to="/login" className="text-primary-600 hover:underline">立即登录 / Login</Link>
          </p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">名字 / First Name</label>
                <input type="text" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">姓氏 / Last Name</label>
                <input type="text" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} className="input-field" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">邮箱 / Email *</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className={`input-field ${errors.email ? 'border-red-500' : ''}`} />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">手机号 / Phone</label>
              <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="input-field" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">密码 / Password *</label>
              <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className={`input-field ${errors.password ? 'border-red-500' : ''}`} placeholder="至少8位 / At least 8 chars" />
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">确认密码 / Confirm Password *</label>
              <input type="password" value={formData.confirm_password} onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })} className={`input-field ${errors.confirm_password ? 'border-red-500' : ''}`} />
              {errors.confirm_password && <p className="text-red-500 text-sm mt-1">{errors.confirm_password}</p>}
            </div>

            <button type="submit" disabled={registerMutation.isPending} className="btn-primary w-full py-3">
              {registerMutation.isPending ? '注册中... / Registering...' : '注册 / Register'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
