import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Bell, Check, Trash2, Package } from 'lucide-react';

interface Notification {
  id: string;
  order_id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  phone_number: string;
  total_amount: number;
  message: string;
  is_read: boolean;
  type: string;
  created_at: string;
}

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setNotifications(data as Notification[]);
    } else {
        console.warn("Could not load notifications. Setup missing?", error);
        setNotifications([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();

    const channel = supabase.channel('admin-notifs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
    if (!error) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    }
  };

  const markAllAsRead = async () => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('is_read', false);
    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    }
  };

  const deleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);
    if (!error) {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }
  };

  if (loading) {
     return <div className="animate-pulse space-y-4">
         <div className="h-20 bg-zinc-100 rounded-lg"></div>
         <div className="h-20 bg-zinc-100 rounded-lg"></div>
     </div>
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow-sm border border-zinc-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center">
            <Bell size={20} className="text-zinc-600" />
          </div>
          <div>
             <h1 className="text-xl font-serif">Notifications</h1>
             <p className="text-sm text-zinc-500">You have {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}</p>
          </div>
        </div>
        {unreadCount > 0 && (
            <button 
                onClick={markAllAsRead}
                className="text-xs uppercase tracking-widest font-bold text-zinc-500 hover:text-black transition-colors flex items-center gap-2"
            >
                <Check size={14} />
                Mark all read
            </button>
        )}
      </div>

      <div className="space-y-4">
        {notifications.length === 0 ? (
            <div className="bg-white p-12 rounded-lg border border-zinc-100 text-center">
                <Bell size={32} className="mx-auto text-zinc-300 mb-4" />
                <h3 className="text-lg font-medium text-zinc-900 mb-1">No notifications yet</h3>
                <p className="text-zinc-500">When customers place orders, they will appear here.</p>
            </div>
        ) : (
            notifications.map((notif) => (
                <div 
                    key={`notif-${notif.id}`} 
                    onClick={() => !notif.is_read && markAsRead(notif.id)}
                    className={`p-6 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all cursor-pointer ${notif.is_read ? 'bg-white border-zinc-100' : 'bg-blue-50/50 border-blue-100'}`}
                >
                    <div className="flex items-start gap-4">
                        <div className={`mt-1 rounded-full p-2 ${notif.is_read ? 'bg-zinc-100 text-zinc-500' : 'bg-blue-100 text-blue-600'}`}>
                            <Package size={16} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className={`text-sm font-bold ${notif.is_read ? 'text-zinc-700' : 'text-black'}`}>
                                    {notif.type === 'new_order' ? 'New Order Received' : 'Order Update'}
                                </h3>
                                {!notif.is_read && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
                            </div>
                            <p className="text-sm text-zinc-600 mb-2">{notif.message}</p>
                            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-zinc-500">
                                <span className="font-mono bg-zinc-100 px-2 py-0.5 rounded text-zinc-700">{notif.order_number}</span>
                                <span>{notif.customer_name}</span>
                                <span>Rs. {notif.total_amount}</span>
                                <span>{new Date(notif.created_at).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 justify-end self-end md:self-center">
                        <button 
                            onClick={(e) => deleteNotification(notif.id, e)}
                            className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            title="Delete notification"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
            ))
        )}
      </div>
    </div>
  );
}
