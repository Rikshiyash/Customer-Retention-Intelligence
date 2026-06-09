import { useState, useEffect } from 'react';
import { api, Notification } from '../api/client';
import { LoadingState } from '../components/ui/LoadingState';
import { Bell, CheckCircle2 } from 'lucide-react';
import { cn, timeAgo } from '../lib/utils';

export function NotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    api.getNotifications()
      .then(res => {
        setNotifications(res);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">Stay updated on alerts and system events.</p>
        </div>
        <button className="text-sm font-medium text-[#2563EB] hover:text-[#1D4ED8] transition-colors">
          Mark all as read
        </button>
      </div>

      <div className="card divide-y divide-[#E2E8F0]">
        {loading ? (
          <LoadingState text="Loading notifications..." />
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-[#64748B]">No notifications found.</div>
        ) : (
          notifications.map(notif => (
            <div key={notif.id} className={cn("p-5 flex gap-4 transition-colors", !notif.read ? "bg-[#EFF6FF]" : "hover:bg-[#F8FAFC]")}>
              <div className="mt-1">
                {notif.priority === 'high' ? (
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                    <Bell className="w-4 h-4 text-red-600" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <h4 className={cn("text-sm font-semibold", !notif.read ? "text-[#0F172A]" : "text-[#334155]")}>
                    {notif.type}
                  </h4>
                  <span className="text-xs text-[#94A3B8] whitespace-nowrap">{timeAgo(notif.timestamp)}</span>
                </div>
                <p className="text-sm text-[#64748B] leading-relaxed">{notif.message}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
