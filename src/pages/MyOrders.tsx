import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Order } from '../types';
import { formatINR } from '../lib/utils';
import { ShoppingBag, Package, Truck, CheckCircle, XCircle, Clock, ChevronRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

export default function MyOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  useEffect(() => {
    if (!user) return;

    const fetchOrders = async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const ords: Order[] = Array.from(new Map<string, Order>((data || []).map(o => [o.id, {
          id: o.id,
          orderNumber: o.order_number,
          userId: o.user_id,
          customerName: o.customer_name,
          customerEmail: o.customer_email,
          phoneNumber: o.phone_number,
          shippingAddress: o.shipping_address,
          zipCode: o.zip_code,
          paymentMethod: o.payment_method,
          status: o.status,
          totalAmount: o.total_price,
          createdAt: { toDate: () => new Date(o.created_at) } as any, // Mocking Firebase toDate for UI compatibility
          cancelledAt: o.cancelled_at ? { toDate: () => new Date(o.cancelled_at) } as any : undefined,
          cancelledBy: o.cancelled_by,
          cancellationReason: o.cancellation_reason,
          items: o.items
        }])).values());
        
        setOrders(ords);
      } catch (error) {
        console.error("Error fetching Supabase orders:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();

    // Subscribe to changes
    const subscription = supabase
      .channel('orders_channel')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'orders',
        filter: `user_id=eq.${user.id}`
      }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const cancelOrder = (orderId: string) => {
    setOrderToCancel(orderId);
    setModalOpen(true);
  };

  const confirmCancellation = async () => {
    if (!user || !orderToCancel) return;

    try {
      setCancellingId(orderToCancel);
      
      console.log('Cancelling order:', orderToCancel);
      const { data, error } = await supabase
        .from('orders')
        .update({ 
          status: 'cancelled',
          cancelled_by: 'user',
          cancelled_at: new Date().toISOString()
        })
        .eq('id', orderToCancel)
        .eq('user_id', user.id);
        
      console.log('Update result:', data);
      console.log('Update error:', error);

      if (error) throw error;
      
      setToastMessage('Order cancelled successfully');
    } catch (error: any) {
      console.error("Cancel error:", error);
      setToastMessage(`Cancel failed: ${error.message || 'Unknown error'}`);
    } finally {
      setCancellingId(null);
      setModalOpen(false);
      setOrderToCancel(null);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return { icon: <Clock size={16} />, text: 'Pending', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' };
      case 'shipped': return { icon: <Truck size={16} />, text: 'Shipped', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' };
      case 'delivered': return { icon: <CheckCircle size={16} />, text: 'Delivered', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' };
      case 'cancelled': return { icon: <XCircle size={16} />, text: 'Cancelled', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' };
      default: return { icon: <Clock size={16} />, text: 'Processing', color: 'text-zinc-600', bg: 'bg-zinc-50', border: 'border-zinc-100' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-40 pb-24 bg-white flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-2 border-zinc-200 border-t-black rounded-full animate-spin mb-6"></div>
        <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-zinc-400">Loading Your History</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-40 pb-24 bg-[#FAFAFA]">
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-16 gap-6">
          <div>
            <h1 className="text-5xl font-serif mb-4">My Orders</h1>
            <p className="text-sm text-zinc-500 uppercase tracking-widest font-medium">Track your recent purchases and history</p>
          </div>
          <Link to="/shop" className="text-[10px] uppercase tracking-widest font-bold hover:tracking-[0.2em] transition-all flex items-center gap-2 group">
             Continue Shopping <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {orders.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-zinc-200 p-24 text-center rounded-sm"
          >
            <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-8 text-zinc-300">
               <Package size={40} />
            </div>
            <h2 className="text-2xl font-serif mb-4">No orders placed yet</h2>
            <p className="text-zinc-500 mb-12 max-w-xs mx-auto">Looks like you haven't made any purchases. Explore our latest collections to find something you love.</p>
            <Link to="/shop" className="btn-primary px-12 py-5 inline-block">Explore Shop</Link>
          </motion.div>
        ) : (
          <div className="space-y-8">
            {orders.map((order) => {
              if (!order) return null;
              const statusValue = order.status || 'pending';
              const statusInfo = getStatusInfo(statusValue);
              return (
                <motion.div 
                  key={`my-order-${order.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-zinc-200 overflow-hidden rounded-sm hover:shadow-xl hover:shadow-black/5 transition-all group"
                >
                  {/* Order Header */}
                  <div className="p-6 md:p-8 border-b border-zinc-100 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-zinc-50/50">
                    <div className="flex items-center gap-6">
                      <div className={`w-12 h-12 ${statusInfo.bg} ${statusInfo.color} ${statusInfo.border} border rounded-full flex items-center justify-center shrink-0`}>
                        {statusInfo.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Order ID</span>
                          <span className="text-xs font-mono font-bold tracking-wider">{order.orderNumber || `#${order.id?.slice(-8).toUpperCase() || 'UNKNOWN'}`}</span>
                        </div>
                        <div className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                          {order.createdAt?.toDate ? (
                            `Placed on ${order.createdAt.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })} at ${order.createdAt.toDate().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}`
                          ) : 'Processing order details...'}
                        </div>
                        {order.cancelledAt && typeof order.cancelledAt.toDate === 'function' && (
                          <div className="text-[10px] uppercase tracking-widest font-bold text-rose-500 mt-1">
                            Cancelled on {order.cancelledAt.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col md:items-end">
                       <div className={`text-[10px] uppercase tracking-widest font-bold ${statusInfo.color} mb-1 flex items-center gap-2`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${statusInfo.color.replace('text', 'bg')}`}></div>
                          {statusInfo.text}
                       </div>
                       <div className="text-xl font-serif font-bold">{formatINR(order.totalAmount || 0)}</div>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="p-6 md:p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {order.items?.map((item, idx) => (
                        <div key={`my-order-${order.id}-item-${idx}`} className="flex gap-4 p-2 transition-transform group-hover:translate-x-1">
                          <div className="w-16 aspect-[3/4] bg-zinc-100 shrink-0 border border-zinc-100">
                             <img src={item.imageUrl || 'https://via.placeholder.com/150?text=No+Image'} alt={item.productName || 'Product'} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex flex-col justify-between py-1">
                             <div>
                               <h4 className="text-[10px] uppercase tracking-widest font-bold line-clamp-1">{item.productName || 'Unnamed Product'}</h4>
                               <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1">Size: {item.size || 'N/A'} • Qty: {item.quantity || 1}</p>
                             </div>
                             <p className="text-xs font-bold">{formatINR(item.price || 0)}</p>
                          </div>
                        </div>
                      )) || (
                        <p className="text-xs text-zinc-400 italic">No items found in this order.</p>
                      )}
                    </div>
                    
                    {/* Order Footer Extra Info */}
                    <div className="mt-8 pt-8 border-t border-zinc-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                       <div className="flex flex-col gap-1">
                          <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-zinc-400">Shipping To</span>
                          <span className="text-xs text-zinc-600 max-w-xs">
                            {typeof order.shippingAddress === 'string' 
                               ? order.shippingAddress 
                               : (order.shippingAddress as any)?.address 
                                  ? `${(order.shippingAddress as any).address}, ${(order.shippingAddress as any).city}, ${(order.shippingAddress as any).state} - ${(order.shippingAddress as any).zipCode}`
                                  : 'Address not available'}
                          </span>
                       </div>
                       <div className="flex items-center gap-4">
                          <div className="flex flex-col items-end gap-1">
                             <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-zinc-400">Method</span>
                             <span className="text-[10px] font-bold uppercase tracking-widest bg-zinc-100 px-2 py-1 rounded">{order.paymentMethod || 'COD'}</span>
                          </div>
                       </div>
                    </div>

                    {statusValue.toLowerCase() === 'pending' && (
                      <button 
                        onClick={() => cancelOrder(order.id)}
                        disabled={cancellingId === order.id}
                        className="mt-10 w-full py-4 border border-red-100 bg-red-50/20 text-red-600 text-[10px] uppercase tracking-widest font-bold hover:bg-red-50 transition-all flex items-center justify-center gap-2 rounded-sm disabled:opacity-50 disabled:cursor-not-allowed group/btn"
                      >
                        {cancellingId === order.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <XCircle size={12} className="group-hover/btn:scale-110 transition-transform" />
                        )}
                        Cancel Order
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => {
                if (!cancellingId) {
                  setModalOpen(false);
                  setOrderToCancel(null);
                }
              }}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white w-full max-w-md border border-zinc-200 rounded-sm shadow-2xl overflow-hidden"
            >
              <div className="p-8 pb-6 text-center">
                <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <XCircle size={32} className="text-rose-500" />
                </div>
                <h3 className="text-2xl font-serif mb-2">Cancel Order</h3>
                <p className="text-zinc-500 text-sm">Are you sure you want to cancel this order? This action cannot be undone.</p>
              </div>
              <div className="p-4 bg-zinc-50 border-t border-zinc-100 flex gap-3">
                <button 
                  onClick={() => {
                    setModalOpen(false);
                    setOrderToCancel(null);
                  }}
                  disabled={cancellingId !== null}
                  className="flex-1 py-3 text-[10px] uppercase tracking-widest font-bold border border-zinc-200 bg-white hover:bg-zinc-50 transition-colors rounded-sm disabled:opacity-50"
                >
                  Keep Order
                </button>
                <button 
                  onClick={confirmCancellation}
                  disabled={cancellingId !== null}
                  className="flex-1 py-3 text-[10px] uppercase tracking-widest font-bold border border-rose-600 bg-rose-600 text-white hover:bg-rose-700 transition-colors rounded-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {cancellingId !== null ? <Loader2 size={14} className="animate-spin" /> : null}
                  Cancel Order
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-black text-white px-6 py-4 rounded-sm shadow-2xl flex items-center gap-3 text-sm font-medium tracking-wide whitespace-nowrap"
          >
            <CheckCircle size={16} className="text-emerald-400" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
