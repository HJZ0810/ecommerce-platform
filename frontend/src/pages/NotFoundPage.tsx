/**
 * 404 页面 / Not Found Page
 * @module pages/NotFoundPage
 */

import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-gray-200">404</h1>
        <h2 className="text-2xl font-semibold text-gray-900 mt-4">页面未找到 / Page Not Found</h2>
        <p className="text-gray-500 mt-2">抱歉，您访问的页面不存在</p>
        <Link to="/" className="btn-primary mt-8 inline-block">返回首页 / Go Home</Link>
      </div>
    </div>
  );
}
