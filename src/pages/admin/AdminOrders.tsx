import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Order } from '../../types';
import { formatINR } from '../../lib/utils';
import { ChevronDown, ChevronUp, Package, Clock, Truck, CheckCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('All');

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

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
        createdAt: { toDate: () => new Date(ord.created_at) } as any,
        cancelledAt: ord.cancelled_at ? { toDate: () => new Date(ord.cancelled_at) } as any : undefined
      }])).values());

      setOrders(formattedOrders);
      setLoading(false);
    } catch (err: any) {
      console.error("Supabase error:", err);
      setError(err.message || "Failed to load orders.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    // Set up real-time subscription
    const channel = supabase
      .channel('admin_orders_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredOrders = filter === 'All' 
    ? orders 
    : orders.filter(o => o.status === filter);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'Cancelled') {
        updateData.cancelled_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      fetchOrders(); // Refresh local state
    } catch (err: any) {
      console.error("Update status error:", err);
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return <Clock size={14} className="text-amber-500" />;
      case 'shipped': return <Truck size={14} className="text-blue-500" />;
      case 'delivered': return <CheckCircle size={14} className="text-green-500" />;
      case 'cancelled': return <XCircle size={14} className="text-red-500" />;
      default: return null;
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'shipped': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'delivered': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'cancelled': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-zinc-50 text-zinc-600 border-zinc-200';
    }
  };

  return (
    <div className="pb-12">
       <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <div>
            <h1 className="text-3xl font-serif mb-2">Orders</h1>
            <p className="text-xs text-zinc-500 uppercase tracking-widest font-medium">Manage customer purchases and fulfillment</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {['All', 'Pending', 'Shipped', 'Delivered', 'Cancelled'].map((status) => (
              <button
                key={`status-filter-${status}`}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-full text-[10px] uppercase tracking-widest font-bold transition-all border ${
                  filter === status 
                    ? 'bg-black text-white border-black' 
                    : 'bg-white text-zinc-400 border-zinc-200 hover:border-zinc-400'
                }`}
              >
                {status}
              </button>
            ))}
            <div className="h-4 w-px bg-zinc-200 mx-2 hidden md:block"></div>
            <div className="bg-zinc-100 px-4 py-2 rounded-full text-[10px] uppercase tracking-widest font-bold text-zinc-600">
              {filteredOrders.length} {filter !== 'All' ? filter : ''} Orders
            </div>
          </div>
       </div>

       {error ? (
         <div className="bg-red-50 border border-red-100 p-12 text-center rounded-sm">
            <XCircle size={40} className="mx-auto text-red-300 mb-4" />
            <h2 className="text-xl font-serif text-red-900 mb-2">Observation Failed</h2>
            <p className="text-red-600 text-sm max-w-md mx-auto mb-8">{error}</p>
            <button 
               onClick={() => window.location.reload()}
               className="px-8 py-3 bg-red-600 text-white text-[10px] uppercase tracking-widest font-bold hover:bg-red-700 transition-colors"
            >
               Retry Connection
            </button>
         </div>
       ) : loading ? (
         <div className="flex flex-col items-center justify-center py-24 text-zinc-400">
            <div className="w-8 h-8 border-2 border-zinc-200 border-t-black rounded-full animate-spin mb-4"></div>
            <p className="text-[10px] uppercase tracking-widest font-bold">InSync with Database...</p>
         </div>
       ) : (
         <div className="bg-white border border-zinc-200 overflow-hidden">
           <table className="w-full text-left text-sm">
             <thead className="bg-zinc-50 border-b border-zinc-200">
               <tr>
                 <th className="px-6 py-5 font-semibold text-zinc-500 uppercase tracking-widest text-[10px]">Order Details</th>
                 <th className="px-6 py-5 font-semibold text-zinc-500 uppercase tracking-widest text-[10px]">Customer</th>
                 <th className="px-6 py-5 font-semibold text-zinc-500 uppercase tracking-widest text-[10px]">Grand Total</th>
                 <th className="px-6 py-5 font-semibold text-zinc-500 uppercase tracking-widest text-[10px]">Status</th>
                 <th className="px-6 py-5 font-semibold text-zinc-500 uppercase tracking-widest text-[10px] text-right">View</th>
               </tr>
             </thead>
             <tbody>
               {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-24 text-center">
                       <Package size={40} className="mx-auto text-zinc-200 mb-4" />
                       <p className="text-zinc-500 uppercase tracking-widest text-[10px] font-bold">No {filter !== 'All' ? filter.toLowerCase() : ''} orders found yet.</p>
                    </td>
                  </tr>
               )}
               {filteredOrders.map((order) => (
                 <React.Fragment key={`admin-order-fragment-${order.id}`}>
                   <tr className={`border-b border-zinc-100 transition-colors hover:bg-zinc-50/50 ${expandedId === order.id ? 'bg-zinc-50' : ''}`}>
                     <td className="px-6 py-6">
                        <div className="font-mono text-xs text-zinc-400 mb-1">#{order.id.slice(-8).toUpperCase()}</div>
                        <div className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                           {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + order.createdAt.toDate().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) : 'N/A'}
                        </div>
                        {order.cancelledAt && (
                          <div className="text-[9px] uppercase tracking-widest font-bold text-red-500 mt-1 flex items-center gap-1">
                            <XCircle size={8} /> Cancelled: {order.cancelledAt.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </div>
                        )}
                     </td>
                     <td className="px-6 py-6">
                        <div className="font-bold text-black text-xs uppercase tracking-wider mb-0.5">{order.customerName}</div>
                        <div className="text-xs text-zinc-500">{order.customerEmail}</div>
                     </td>
                     <td className="px-6 py-6 font-bold text-black">{formatINR(order.totalAmount)}</td>
                     <td className="px-6 py-6">
                        <select 
                           value={order.status || (order as any).orderStatus || 'Pending'}
                           onChange={(e) => updateStatus(order.id, e.target.value)}
                           className={`text-[9px] uppercase tracking-widest font-bold px-3 py-2 rounded-full border outline-none cursor-pointer transition-all appearance-none pr-8 relative bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22/%3E%3C/svg%3E')] bg-[length:8px_8px] bg-[right_0.75rem_center] bg-no-repeat
                              ${getStatusStyles(order.status || (order as any).orderStatus || 'Pending')}`}
                        >
                           <option value="Pending">Pending</option>
                           <option value="Shipped">Shipped</option>
                           <option value="Delivered">Delivered</option>
                           <option value="Cancelled">Cancelled</option>
                        </select>
                     </td>
                     <td className="px-6 py-6 text-right">
                        <button 
                           onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                           className={`p-2 rounded-full transition-all ${expandedId === order.id ? 'bg-black text-white' : 'hover:bg-zinc-200 text-zinc-400'}`}
                        >
                           {expandedId === order.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                     </td>
                   </tr>
                   <AnimatePresence>
                     {expandedId === order.id && (
                        <tr className="bg-zinc-50 border-b border-zinc-200">
                           <td colSpan={5} className="px-0">
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                 <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12">
                                    {/* Customer Info */}
                                    <div>
                                       <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-400 mb-6 flex items-center gap-2">
                                          <div className="w-1 h-1 bg-zinc-400 rounded-full"></div>
                                          Customer Information
                                       </h4>
                                       <div className="space-y-4">
                                          <div className="flex flex-col gap-1">
                                             <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Phone</span>
                                             <span className="text-sm font-medium">{order.phoneNumber}</span>
                                          </div>
                                          <div className="flex flex-col gap-1">
                                             <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Shipping Address</span>
                                             <span className="text-sm font-medium leading-relaxed">
                                                {typeof order.shippingAddress === 'string' 
                                                   ? order.shippingAddress 
                                                   : (order.shippingAddress as any)?.address 
                                                      ? `${(order.shippingAddress as any).address}, ${(order.shippingAddress as any).city}, ${(order.shippingAddress as any).state} - ${(order.shippingAddress as any).zipCode}`
                                                      : 'Address not available'}
                                             </span>
                                          </div>
                                          <div className="flex flex-col gap-1">
                                             <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Payment Method</span>
                                             <span className="text-xs font-bold uppercase tracking-widest bg-zinc-200 px-2 py-1 rounded inline-block w-fit">
                                                {order.paymentMethod}
                                             </span>
                                          </div>
                                       </div>
                                    </div>

                                    {/* Items List */}
                                    <div>
                                       <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-400 mb-6 flex items-center gap-2">
                                          <div className="w-1 h-1 bg-zinc-400 rounded-full"></div>
                                          Order Items
                                       </h4>
                                       <div className="space-y-3">
                                          {order.items.map((item, itemIdx) => (
                                             <div key={`order-details-${order.id}-item-${itemIdx}`} className="flex gap-4 bg-white p-4 border border-zinc-200 group hover:border-black transition-colors">
                                                <div className="w-12 h-16 bg-zinc-100 shrink-0">
                                                   <img src={item.imageUrl || 'https://via.placeholder.com/150?text=No+Image'} alt={item.productName} className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex-1 flex flex-col justify-between py-0.5">
                                                   <div className="flex justify-between items-start">
                                                      <div>
                                                         <p className="font-bold text-[10px] uppercase tracking-wider">{item.productName}</p>
                                                         <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Size: {item.size} • Qty: {item.quantity}</p>
                                                      </div>
                                                      <p className="font-bold text-xs">{formatINR(item.price * item.quantity)}</p>
                                                   </div>
                                                </div>
                                             </div>
                                          ))}
                                          <div className="pt-4 mt-4 border-t border-zinc-200 flex justify-between items-center">
                                             <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-400">Total Charged</span>
                                             <span className="text-lg font-serif font-bold text-black">{formatINR(order.totalAmount)}</span>
                                          </div>
                                       </div>
                                    </div>
                                 </div>
                              </motion.div>
                           </td>
                        </tr>
                     )}
                   </AnimatePresence>
                 </React.Fragment>
               ))}
             </tbody>
           </table>
         </div>
       )}
    </div>
  );
}
