/**
 * 通知中心页 / Notifications Page
 * @description 展示用户通知列表
 * @module pages/account/NotificationsPage
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { api } from '@/services/api';

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications?limit=50'),
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => api.put(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.put('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('所有通知已标记为已读 / All marked as read');
    },
  });

  const notifications = data?.data || [];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">通知中心 / Notifications</h1>
        <button onClick={() => markAllMutation.mutate()} className="btn-secondary text-sm">
          全部标记已读 / Mark All Read
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-4">{Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="card p-4 animate-pulse"><div className="h-4 bg-gray-200 rounded w-3/4" /></div>
        ))}</div>
      ) : notifications.length > 0 ? (
        <div className="space-y-3">
          {notifications.map((notif: any) => (
            <div key={notif.id} className={`card p-4 ${notif.is_read ? 'opacity-75' : 'border-l-4 border-l-primary-600'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">{notif.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{notif.content}</p>
                  <p className="text-xs text-gray-400 mt-2">{new Date(notif.created_at).toLocaleString('zh-CN')}</p>
                </div>
                {!notif.is_read && (
                  <button onClick={() => markAsReadMutation.mutate(notif.id)} className="text-xs text-primary-600 hover:underline">
                    标记已读
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🔔</div>
          <p className="text-gray-500">暂无通知 / No notifications</p>
        </div>
      )}
    </div>
  );
}
