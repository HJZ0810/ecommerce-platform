/**
 * 联系我们页 / Contact Page
 * @module pages/shop/ContactPage
 */

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { api } from '@/services/api';

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('消息已发送 / Message sent');
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">联系我们 / Contact Us</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">姓名 / Name</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">邮箱 / Email</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">主题 / Subject</label>
              <input type="text" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">消息 / Message</label>
              <textarea value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} rows={5} className="input-field" required />
            </div>
            <button type="submit" className="btn-primary w-full">发送 / Send</button>
          </form>
        </div>
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="font-semibold mb-2">客服邮箱 / Support Email</h3>
            <p className="text-gray-600">support@example.com</p>
          </div>
          <div className="card p-6">
            <h3 className="font-semibold mb-2">工作时间 / Business Hours</h3>
            <p className="text-gray-600">周一至周五 9:00-18:00 / Mon-Fri 9:00-18:00</p>
          </div>
          <div className="card p-6">
            <h3 className="font-semibold mb-2">地址 / Address</h3>
            <p className="text-gray-600">中国上海市浦东新区 / Pudong, Shanghai, China</p>
          </div>
        </div>
      </div>
    </div>
  );
}
