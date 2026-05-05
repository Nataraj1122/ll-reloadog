import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Order } from '../../types';
import { formatINR } from '../../lib/utils';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

export default function AdminAnalytics() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: true });

        if (error) throw error;
        
        const formattedOrders: Order[] = Array.from(new Map<string, Order>(data.map((ord: any) => [ord.id, {
          id: ord.id,
          userId: ord.user_id,
          customerName: ord.customer_name,
          customerEmail: ord.customer_email,
          phoneNumber: ord.phone_number,
          shippingAddress: ord.shipping_address,
          zipCode: ord.zip_code || '',
          paymentMethod: ord.payment_method,
          totalAmount: ord.total_price,
          status: ord.status,
          items: ord.items,
          createdAt: { toDate: () => new Date(ord.created_at) } as any
        }])).values());

        setOrders(formattedOrders);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  // Process data for charts
  const salesByDate = orders.reduce((acc: any, order) => {
    if (!order.createdAt?.toDate) return acc;
    const dateStr = order.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (!acc[dateStr]) acc[dateStr] = 0;
    acc[dateStr] += order.totalAmount;
    return acc;
  }, {});

  const chartData = Object.entries(salesByDate).map(([date, total]) => ({
    date,
    total
  }));

  const totalSales = orders.reduce((sum, o) => sum + o.totalAmount, 0);

  if (loading) return <div className="text-zinc-500">Loading analytics...</div>;

  return (
    <div>
      <h1 className="text-3xl font-serif mb-8">Analytics Overview</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <div className="bg-white p-8 border border-zinc-200">
            <h3 className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-2">Total Sales Revenue</h3>
            <p className="text-5xl font-serif">{formatINR(totalSales)}</p>
        </div>
        <div className="bg-white p-8 border border-zinc-200">
            <h3 className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-2">Average Order Value</h3>
            <p className="text-5xl font-serif">{formatINR(orders.length ? totalSales / orders.length : 0)}</p>
        </div>
      </div>

      <div className="bg-white border border-zinc-200 p-8 h-[400px]">
         <h3 className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-8">Sales Trend</h3>
         {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                 <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="#000" stopOpacity={0.1}/>
                       <stop offset="95%" stopColor="#000" stopOpacity={0}/>
                    </linearGradient>
                 </defs>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E4E7" />
                 <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#71717A' }} 
                    dy={10} 
                 />
                 <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#71717A' }} 
                    tickFormatter={(val) => `₹${val}`}
                    dx={-10}
                 />
                 <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #E4E4E7', borderRadius: 0, padding: '12px' }}
                    labelStyle={{ color: '#71717A', fontWeight: 'bold', fontSize: '10px', textTransform: 'uppercase', marginBottom: '8px' }}
                 />
                 <Area type="monotone" dataKey="total" stroke="#000" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" />
              </AreaChart>
            </ResponsiveContainer>
         ) : (
            <div className="h-full flex items-center justify-center text-zinc-400 font-medium">Not enough data to display</div>
         )}
      </div>
    </div>
  );
}
