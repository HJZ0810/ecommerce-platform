/**
 * 忘记密码页 / Forgot Password Page
 * @description 请求密码重置邮件
 * @module pages/auth/ForgotPasswordPage
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { api } from '@/services/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const forgotMutation = useMutation({
    mutationFn: (data: any) => api.post('/auth/password/forgot', data),
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: () => {
      setError('发送失败，请重试 / Failed to send, please try again');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('请输入邮箱 / Please enter email');
      return;
    }
    setError('');
    forgotMutation.mutate({ email });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">忘记密码 / Forgot Password</h2>
          <p className="mt-2 text-sm text-gray-600">
            <Link to="/login" className="text-primary-600 hover:underline">返回登录 / Back to Login</Link>
          </p>
        </div>

        <div className="card p-8">
          {submitted ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">📧</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">重置链接已发送 / Reset link sent</h3>
              <p className="text-gray-600 text-sm">如果邮箱存在，重置链接已发送至 {email}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">邮箱 / Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`input-field ${error ? 'border-red-500' : ''}`} placeholder="your@email.com" />
                {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
              </div>
              <button type="submit" disabled={forgotMutation.isPending} className="btn-primary w-full py-3">
                {forgotMutation.isPending ? '发送中...' : '发送重置链接 / Send Reset Link'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
