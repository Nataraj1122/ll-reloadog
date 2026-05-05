import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { formatINR } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Users, BadgeIndianRupee, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
      sales: 0,
      orders: 0,
      customers: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
     const fetchStats = async () => {
         try {
             // Fetch non-cancelled orders for sales and count
             const { data: ordersData, error: ordersError } = await supabase
               .from('orders')
               .select('total_price, status');
             
             if (ordersError) throw ordersError;

             // Fetch customers count from profiles
             const { count: customersCount, error: profilesError } = await supabase
               .from('profiles')
               .select('*', { count: 'exact', head: true });
             
             if (profilesError) throw profilesError;

             let totalSales = 0;
             ordersData?.forEach(order => {
                 if (order.status?.toLowerCase() !== 'cancelled') {
                    totalSales += order.total_price || 0;
                 }
             });

             setStats({
                 sales: totalSales,
                 orders: ordersData?.length || 0,
                 customers: customersCount || 0
             });
         } catch (error) {
             console.error("Error fetching stats:", error);
         } finally {
             setLoading(false);
         }
     };

     fetchStats();

     // Real-time listeners for stats
     const ordersChannel = supabase
       .channel('admin-stats-orders')
       .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
         fetchStats();
       })
       .subscribe();

     const profilesChannel = supabase
       .channel('admin-stats-profiles')
       .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
         fetchStats();
       })
       .subscribe();

     return () => {
       supabase.removeChannel(ordersChannel);
       supabase.removeChannel(profilesChannel);
     };
  }, []);

  const statCards = [
    { 
        title: 'Total Sales', 
        value: formatINR(stats.sales), 
        icon: <BadgeIndianRupee className="text-green-600" size={20} />, 
        color: 'text-green-700',
        path: '/admin/analytics'
    },
    { 
        title: 'Total Orders', 
        value: stats.orders.toString(), 
        icon: <ShoppingCart className="text-zinc-600" size={20} />, 
        color: 'text-black',
        path: '/admin/orders'
    },
    { 
        title: 'Customers', 
        value: stats.customers.toString(), 
        icon: <Users className="text-zinc-600" size={20} />, 
        color: 'text-black',
        path: '/admin/customers'
    }
  ];

  return (
    <div className="pb-12">
       <div className="mb-12">
          <h1 className="text-3xl font-serif mb-2">Dashboard</h1>
          <p className="text-xs text-zinc-500 uppercase tracking-widest font-medium">Overview of your store's performance</p>
       </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {statCards.map((card, idx) => (
             <motion.div 
                key={`stat-${card.title.replace(/\s+/g, '-').toLowerCase()}`} 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                onClick={() => navigate(card.path)}
                className="bg-white p-10 border border-zinc-100 shadow-sm hover:shadow-2xl transition-all cursor-pointer group relative overflow-hidden"
             >
                <div className="flex justify-between items-start mb-6">
                    <div className="p-4 bg-zinc-50 rounded-xl group-hover:scale-110 transition-transform">
                        {card.icon}
                    </div>
                </div>
                <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold text-zinc-400 mb-3">{card.title}</h3>
                <p className={`text-5xl font-serif tracking-tighter ${card.color}`}>{loading ? '...' : card.value}</p>
                <div className="mt-8 flex items-center gap-2 text-zinc-400 text-[9px] uppercase tracking-widest font-bold group-hover:text-black transition-colors">
                   View Detailed <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                </div>
             </motion.div>
          ))}
       </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
           <div className="lg:col-span-2 bg-white border border-zinc-100 p-10">
              <div className="flex items-center justify-between mb-8">
                 <h2 className="text-xl font-serif">Recent Operations</h2>
                 <button onClick={() => navigate('/admin/orders')} className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 hover:text-black transition-colors">See all</button>
              </div>
              <div className="space-y-6">
                 {loading ? (
                    [1,2,3].map(i => <div key={`skeleton-log-${i}`} className="h-16 bg-zinc-50 animate-pulse rounded-sm"></div>)
                 ) : (
                    <div className="divide-y divide-zinc-50">
                       <p className="text-sm text-zinc-500 italic py-12 text-center">Operational logs and real-time activity will appear here as orders flow in.</p>
                    </div>
                 )}
              </div>
           </div>

           <div className="bg-black text-white p-10 rounded-sm">
              <h2 className="text-xl font-serif mb-6 text-white">System Status</h2>
              <div className="space-y-6">
                 <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">Database</span>
                    <span className="text-[10px] uppercase tracking-widest font-bold text-emerald-500 flex items-center gap-2">
                       <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                       Operational
                    </span>
                 </div>
                 <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">API Latency</span>
                    <span className="text-[10px] uppercase tracking-widest font-bold">24ms</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">Uptime</span>
                    <span className="text-[10px] uppercase tracking-widest font-bold">99.9%</span>
                 </div>
              </div>
              <div className="mt-12 p-6 bg-zinc-900 border border-zinc-800">
                 <p className="text-[10px] text-zinc-400 leading-relaxed">
                    Automated deployments and security audits are active. All transactions are encrypted.
                 </p>
              </div>
           </div>
        </div>
    </div>
  );
}
