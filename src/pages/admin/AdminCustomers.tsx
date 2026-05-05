import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Customer, Order } from '../../types';
import { formatINR } from '../../lib/utils';
import { User, ChevronDown, ChevronUp, Package, Clock, CheckCircle, XCircle, Truck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  useEffect(() => {
    setExpandedOrderId(null);
  }, [expandedId]);

  const fetchData = async () => {
    try {
      // Fetch customers (profiles)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profileError) throw profileError;

      // Fetch orders
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (orderError) throw orderError;

      // Format orders (deduplicate)
      const formattedOrders: Order[] = Array.from(new Map<string, Order>(orderData.map((ord: any) => [ord.id, {
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

      // Format customers and calculate aggregates (deduplicate)
      const formattedCustomers: Customer[] = Array.from(new Map<string, Customer>(profileData.map((prof: any) => {
        const custOrders = formattedOrders.filter(o => o.userId === prof.id);
        const totalSpent = custOrders.reduce((sum, o) => sum + o.totalAmount, 0);
        
        return [prof.id, {
          id: prof.id,
          name: prof.full_name,
          email: prof.email,
          phone: prof.phone_number,
          totalOrders: custOrders.length,
          totalSpent: totalSpent,
          createdAt: { toDate: () => new Date(prof.created_at) } as any
        }];
      })).values());

      setOrders(formattedOrders);
      setCustomers(formattedCustomers);
      setLoading(false);
    } catch (err: any) {
      console.error("Supabase error:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Set up real-time subscription for profiles and orders
    const profileChannel = supabase
      .channel('admin_profiles_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchData())
      .subscribe();

    const orderChannel = supabase
      .channel('admin_orders_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(orderChannel);
    };
  }, []);

  const getCustomerOrders = (userId: string) => {
    return orders.filter(order => order.userId === userId);
  };

  const getStatusStyles = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'shipped': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'delivered': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'cancelled': return 'bg-rose-50 text-rose-600 border-rose-100';
      default: return 'bg-zinc-50 text-zinc-600 border-zinc-100';
    }
  };

  return (
    <div className="pb-12">
       <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-serif">Customers</h1>
            <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mt-1">Manage user database and purchase history</p>
          </div>
       </div>

       {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-zinc-400">
             <div className="w-8 h-8 border-2 border-zinc-200 border-t-black rounded-full animate-spin mb-4"></div>
             <p className="text-[10px] uppercase tracking-widest font-bold">Synchronizing Customer Data...</p>
          </div>
       ) : (
          <div className="bg-white border border-zinc-200 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="px-6 py-5 font-semibold text-zinc-500 uppercase tracking-widest text-[10px]">Customer</th>
                  <th className="px-6 py-5 font-semibold text-zinc-500 uppercase tracking-widest text-[10px]">Total Orders</th>
                  <th className="px-6 py-5 font-semibold text-zinc-500 uppercase tracking-widest text-[10px]">Total Spent</th>
                  <th className="px-6 py-5 font-semibold text-zinc-500 uppercase tracking-widest text-[10px]">Joined</th>
                  <th className="px-6 py-5 font-semibold text-zinc-500 uppercase tracking-widest text-[10px] text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {customers.length === 0 && (
                   <tr>
                     <td colSpan={5} className="px-6 py-24 text-center">
                        <User size={32} className="mx-auto text-zinc-200 mb-4" />
                        <p className="text-zinc-500 uppercase tracking-widest text-[10px] font-bold">No customers registered yet.</p>
                     </td>
                   </tr>
                )}
                {customers.map((customer) => {
                  const customerOrders = getCustomerOrders(customer.id);
                  const isExpanded = expandedId === customer.id;

                  return (
                    <React.Fragment key={`admin-cust-frag-${customer.id}`}>
                      <tr className={`border-b border-zinc-100 transition-colors hover:bg-zinc-50/50 ${isExpanded ? 'bg-zinc-50' : ''}`}>
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-500 shrink-0">
                                 <User size={18} />
                              </div>
                              <div>
                                 {customer.name && <p className="font-bold text-black text-xs uppercase tracking-wider mb-0.5">{customer.name}</p>}
                                 <p className="text-zinc-500 text-xs">{customer.email}</p>
                                 {customer.phone && <p className="text-zinc-400 text-[10px]">{customer.phone}</p>}
                              </div>
                           </div>
                        </td>
                        <td className="px-6 py-4">
                           <div className="font-bold text-black">{customer.totalOrders || 0}</div>
                           <div className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Orders Placed</div>
                        </td>
                        <td className="px-6 py-4">
                           <div className="font-bold text-emerald-600">{formatINR(customer.totalSpent || 0)}</div>
                           <div className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Lifetime Value</div>
                        </td>
                        <td className="px-6 py-4">
                           <div className="font-bold text-black text-[11px] mb-0.5">
                             {customer.createdAt?.toDate ? customer.createdAt.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                           </div>
                           <div className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Registration Date</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                           <button 
                              onClick={() => setExpandedId(isExpanded ? null : customer.id)}
                              className={`px-4 py-2 rounded-full text-[9px] uppercase tracking-[0.2em] font-bold transition-all flex items-center gap-2 ml-auto border ${
                                isExpanded 
                                  ? 'bg-black text-white border-black' 
                                  : 'bg-white text-zinc-500 border-zinc-200 hover:border-black hover:text-black'
                              }`}
                           >
                              {isExpanded ? 'Hide History' : 'View History'}
                              {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                           </button>
                        </td>
                      </tr>
                      
                      <AnimatePresence>
                        {isExpanded && (
                          <tr className="bg-zinc-50/50 border-b border-zinc-200">
                            <td colSpan={5} className="p-0">
                               <motion.div
                                 initial={{ height: 0, opacity: 0 }}
                                 animate={{ height: 'auto', opacity: 1 }}
                                 exit={{ height: 0, opacity: 0 }}
                                 className="overflow-hidden"
                               >
                                  <div className="p-8">
                                     <div className="flex items-center gap-3 mb-8">
                                        <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white">
                                           <Package size={14} />
                                        </div>
                                        <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-black underline underline-offset-8">
                                          Order History • {customerOrders.length} records found
                                        </h4>
                                     </div>

                                     {customerOrders.length === 0 ? (
                                       <div className="bg-white border border-dashed border-zinc-300 rounded-sm p-12 text-center">
                                          <Package size={32} className="mx-auto text-zinc-200 mb-2" />
                                          <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">This customer has no orders yet.</p>
                                       </div>
                                     ) : (
                                       <div className="grid grid-cols-1 gap-4">
                                          {customerOrders.map((order) => {
                                            const isOrderExpanded = expandedOrderId === order.id;
                                            
                                            return (
                                              <div 
                                                key={`admin-cust-ord-${customer.id}-${order.id}`} 
                                                onClick={() => setExpandedOrderId(isOrderExpanded ? null : order.id)}
                                                className={`bg-white border p-6 rounded-sm shadow-sm transition-all cursor-pointer group ${isOrderExpanded ? 'border-black ring-1 ring-black/5' : 'border-zinc-200 hover:border-zinc-400'}`}
                                              >
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                                   <div className="flex items-center gap-6">
                                                      <div>
                                                         <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-1">Order ID</p>
                                                         <p className="font-mono text-xs font-bold">#{order.id.slice(-8).toUpperCase()}</p>
                                                      </div>
                                                      <div className="h-8 w-px bg-zinc-100"></div>
                                                      <div>
                                                         <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-1">Placed On</p>
                                                         <p className="text-xs font-bold">
                                                            {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                                                         </p>
                                                      </div>
                                                      <div className="h-8 w-px bg-zinc-100"></div>
                                                      <div>
                                                         <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-1">Status</p>
                                                         <span className={`text-[9px] uppercase tracking-widest font-bold px-3 py-1 rounded-full border ${getStatusStyles(order.status)}`}>
                                                            {order.status}
                                                         </span>
                                                      </div>
                                                   </div>
                                                   <div className="flex items-center gap-8">
                                                      <div className="text-right">
                                                         <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-1">Total</p>
                                                         <p className="text-lg font-serif font-bold text-black">{formatINR(order.totalAmount)}</p>
                                                      </div>
                                                      <div className={`p-2 rounded-full border transition-colors ${isOrderExpanded ? 'bg-black border-black text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-400 group-hover:text-black group-hover:border-black'}`}>
                                                         {isOrderExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                      </div>
                                                   </div>
                                                </div>

                                                <AnimatePresence>
                                                   {isOrderExpanded ? (
                                                      <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="overflow-hidden"
                                                      >
                                                         <div className="mt-8 pt-8 border-t border-zinc-100">
                                                            <div className="overflow-x-auto">
                                                               <table className="w-full text-left">
                                                                  <thead>
                                                                     <tr className="border-b border-zinc-100">
                                                                        <th className="pb-4 text-[9px] uppercase tracking-widest font-bold text-zinc-400">Product</th>
                                                                        <th className="pb-4 text-[9px] uppercase tracking-widest font-bold text-zinc-400 text-center">Size</th>
                                                                        <th className="pb-4 text-[9px] uppercase tracking-widest font-bold text-zinc-400 text-center">Qty</th>
                                                                        <th className="pb-4 text-[9px] uppercase tracking-widest font-bold text-zinc-400 text-right">Price</th>
                                                                        <th className="pb-4 text-[9px] uppercase tracking-widest font-bold text-zinc-400 text-right">Subtotal</th>
                                                                     </tr>
                                                                  </thead>
                                                                  <tbody className="divide-y divide-zinc-50">
                                                                     {order.items.map((item, itemIdx) => (
                                                                        <tr key={`orders-${customer.id}-${order.id}-item-${itemIdx}`}>
                                                                           <td className="py-4">
                                                                              <div className="flex items-center gap-4">
                                                                                 <img src={item.imageUrl} alt={item.productName} className="w-10 h-12 object-cover bg-zinc-100" />
                                                                                 <span className="text-[11px] font-bold text-black uppercase tracking-wider">{item.productName}</span>
                                                                              </div>
                                                                           </td>
                                                                           <td className="py-4 text-center">
                                                                              <span className="text-[10px] font-bold text-zinc-600 border border-zinc-200 px-2 py-0.5 rounded-sm">{item.size}</span>
                                                                           </td>
                                                                           <td className="py-4 text-center text-[11px] font-bold text-zinc-600">{item.quantity}</td>
                                                                           <td className="py-4 text-right text-[11px] font-bold text-zinc-600">{formatINR(item.price)}</td>
                                                                           <td className="py-4 text-right text-[11px] font-bold text-black">{formatINR(item.price * item.quantity)}</td>
                                                                        </tr>
                                                                     ))}
                                                                  </tbody>
                                                               </table>
                                                            </div>
                                                            <div className="mt-6 flex justify-between items-center p-4 bg-zinc-50 rounded-sm">
                                                               <div className="flex gap-4">
                                                                  <div>
                                                                     <p className="text-[9px] uppercase tracking-widest font-bold text-zinc-400 mb-0.5">Payment Method</p>
                                                                     <p className="text-[10px] font-bold text-black uppercase">{order.paymentMethod || 'COD'}</p>
                                                                  </div>
                                                                  <div className="w-px h-8 bg-zinc-200"></div>
                                                                  <div>
                                                                     <p className="text-[9px] uppercase tracking-widest font-bold text-zinc-400 mb-0.5">Total Items</p>
                                                                     <p className="text-[10px] font-bold text-black uppercase">{order.items.reduce((acc, curr) => acc + curr.quantity, 0)} Units</p>
                                                                  </div>
                                                               </div>
                                                            </div>
                                                         </div>
                                                      </motion.div>
                                                   ) : (
                                                      <div className="mt-6 pt-6 border-t border-zinc-100 flex flex-wrap gap-3">
                                                         {order.items.map((item, idx) => (
                                                            <div key={`summary-${order.id}-${idx}`} className="flex items-center gap-2 bg-zinc-50 pr-3 rounded-sm border border-zinc-100 group-hover:bg-white transition-colors">
                                                               <img src={item.imageUrl} alt={item.productName} className="w-8 h-10 object-cover opacity-80 group-hover:opacity-100" />
                                                               <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-tight">
                                                                  {item.quantity}x {item.size}
                                                               </span>
                                                            </div>
                                                         ))}
                                                         {order.items.length > 4 && (
                                                           <div className="flex items-center px-2 bg-zinc-50 rounded-sm border border-zinc-100">
                                                              <span className="text-[9px] text-zinc-400 font-bold">+{order.items.length - 4} More</span>
                                                           </div>
                                                         )}
                                                      </div>
                                                   )}
                                                </AnimatePresence>
                                              </div>
                                            );
                                          })}
                                       </div>
                                     )}
                                  </div>
                               </motion.div>
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
       )}
    </div>
  );
}
