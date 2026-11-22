/**
 * 商品管理页 / Admin Products Page
 * @module pages/admin/AdminProductsPage
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { api } from '@/services/api';

export default function AdminProductsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => api.get('/admin/products?limit=50'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/products/${id}`),
    onSuccess: () => { toast.success('Deleted'); refetch(); },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">商品管理 / Product Management</h1>
      {isLoading ? (
        <div className="space-y-4">{Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="card p-4 animate-pulse"><div className="h-5 bg-gray-200 rounded w-3/4" /></div>
        ))}</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">商品 / Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">价格 / Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">库存 / Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态 / Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作 / Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data?.data?.map((product: any) => (
                <tr key={product.id}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden">
                        <img src={product.primary_image || '/images/placeholder.jpg'} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{product.name}</p>
                        <p className="text-xs text-gray-500">{product.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">¥{Number(product.price).toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm">{product.available_stock}</td>
                  <td className="px-6 py-4">
                    <span className={`badge ${product.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {product.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => deleteMutation.mutate(product.id)} className="text-red-600 hover:text-red-800 text-sm">
                      删除 / Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
