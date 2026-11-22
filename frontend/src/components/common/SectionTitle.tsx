/**
 * 区块标题组件 / Section Title Component
 * @description 统一风格的区块标题，带查看全部链接
 * @module components/common/SectionTitle
 */

import { Link } from 'react-router-dom';

interface SectionTitleProps {
  title: string;
  subtitle?: string;
  link?: string;
  linkText?: string;
}

export function SectionTitle({ title, subtitle, link, linkText = '查看全部' }: SectionTitleProps) {
  return (
    <div className="flex items-end justify-between mb-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {link && (
        <Link to={link} className="text-primary-600 hover:text-primary-700 text-sm font-medium">
          {linkText} &rarr;
        </Link>
      )}
    </div>
  );
}
