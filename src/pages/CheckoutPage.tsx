import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { formatINR } from '../lib/utils';
import { ShoppingBag, ChevronRight, CheckCircle2, Truck, CreditCard } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { NotificationService } from '../services/notificationService';

export default function CheckoutPage() {
  const { cartItems, cartSubtotal, clearCart } = useAppContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [orderId, setOrderId] = useState('');
  
  const [formData, setFormData] = useState({
    firstName: user?.user_metadata?.full_name?.split(' ')[0] || '',
    lastName: user?.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
    email: user?.email || '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const [orderError, setOrderError] = useState<string>('');
  const [notified, setNotified] = useState<{ success: boolean; message?: string } | null>(null);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.firstName) newErrors.firstName = 'Required';
    if (!formData.lastName) newErrors.lastName = 'Required';
    if (!formData.email) newErrors.email = 'Required';
    if (!formData.phone) newErrors.phone = 'Required';
    if (!formData.address) newErrors.address = 'Required';
    if (!formData.city) newErrors.city = 'Required';
    if (!formData.zipCode) newErrors.zipCode = 'Required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
    setOrderError('');
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    setOrderError('');
    
    // 1. Validation: User logged in
    if (!user) {
      setOrderError('Please sign in to complete your purchase.');
      return;
    }

    // 2. Validation: Cart not empty
    if (cartItems.length === 0) {
      setOrderError('Your cart is empty.');
      return;
    }

    // 3. Validation: Form fields
    if (!validateForm()) {
      setOrderError('Please fill in all required shipping details.');
      return;
    }

    setLoading(true);
    console.log("Attempting to place order with Supabase...", { userId: user.id, itemsCount: cartItems.length });

    try {
      const orderNumber = `RLD-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`;
      
      const itemsData = cartItems.map(item => ({
        productId: item.id,
        productName: item.name,
        price: item.price,
        quantity: item.quantity,
        size: item.size,
        imageUrl: item.image || 'https://via.placeholder.com/150?text=No+Image'
      }));

      const customerName = `${formData.firstName} ${formData.lastName}`;
      const fullAddress = `${formData.address}, ${formData.city}, ${formData.state}`;

      // SEND TO SUPABASE
      const { data: supabaseData, error: supabaseError } = await supabase
        .from('orders')
        .insert([
          {
            user_id: user.id,
            order_number: orderNumber,
            customer_name: customerName,
            customer_email: formData.email,
            phone_number: formData.phone,
            shipping_address: fullAddress,
            zip_code: formData.zipCode,
            items: itemsData,
            total_price: cartSubtotal, 
            payment_method: 'COD',
            status: 'pending',
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (supabaseError) throw supabaseError;
      
      console.log("Order saved to Supabase successfully!", supabaseData);

      // Save notification to Supabase (graceful fail if table doesn't exist yet)
      const { error: notificationError } = await supabase.from('notifications').insert([{
        order_id: supabaseData.id,
        order_number: orderNumber,
        customer_name: customerName,
        customer_email: formData.email,
        phone_number: formData.phone,
        total_amount: cartSubtotal,
        message: `New order placed by ${customerName}`,
        type: 'new_order'
      }]);
      
      if (notificationError) {
        console.warn("Could not save notification to Supabase. Did you run the setup SQL?", notificationError);
      }

      // Call notification service for email/whatsapp
      console.log("[CHECKOUT] Triggering NotificationService.notifyNewOrder for:", orderNumber);
      const notificationResult = await NotificationService.notifyNewOrder({
         order_number: orderNumber,
         customer_name: customerName,
         customer_email: formData.email,
         phone_number: formData.phone,
         total_amount: cartSubtotal,
         shipping_address: fullAddress,
         items: itemsData
      });
      console.log("[CHECKOUT] NotificationService result:", notificationResult);
      
      setNotified(notificationResult as any);
      
      setOrderId(orderNumber);
      await clearCart();
      setSuccess(true);
      
      // navigate('/my-orders'); // Handled by success state now
    } catch (error: any) {
      console.error("Error during Supabase order placement:", error);
      setOrderError(`Failed to place order: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    const today = new Date();
    const deliveryDate = new Date(today);
    deliveryDate.setDate(today.getDate() + 4);
    const formattedDate = deliveryDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

    return (
      <div className="min-h-screen pt-32 pb-24 bg-white">
        <div className="max-w-xl mx-auto px-6 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center"
          >
            <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-8">
              <CheckCircle2 size={40} className="text-white" />
            </div>
            <h1 className="text-4xl font-serif mb-4">Order Confirmed</h1>
            <p className="text-zinc-500 mb-2">Thank you for your purchase. Your order <span className="font-mono text-black">#{orderId.slice(-8).toUpperCase()}</span> has been placed successfully.</p>
            
            {/* Notification Status */}
            <div className={`mt-4 mb-8 px-4 py-3 rounded-sm text-xs font-medium border ${
              notified?.success 
                ? 'bg-zinc-50 border-zinc-100 text-zinc-600' 
                : 'bg-red-50 border-red-100 text-red-600'
            }`}>
              {notified?.success 
                ? `Confirmation sent to ${formData.email}` 
                : `Notification failed: ${notified?.message || 'Technical error'}`
              }
              {!notified && <span className="animate-pulse">Sending confirmation...</span>}
            </div>
            
            <div className="w-full bg-zinc-50 p-6 rounded-lg text-left mb-12 border border-zinc-100">
              <div className="flex items-center gap-3 mb-4 text-xs uppercase tracking-widest font-bold">
                <Truck size={14} />
                <span>Estimated Delivery</span>
              </div>
              <p className="text-sm">{formattedDate}</p>
            </div>

            <Link to="/" className="btn-primary w-full py-5 text-center">Continue Shopping</Link>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-24 bg-white">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-12">
          <Link to="/" className="hover:text-black">Store</Link>
          <ChevronRight size={10} />
          <span className="text-black">Checkout</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          {/* Left Column: Form */}
          <div className="lg:col-span-7">
            <h1 className="text-4xl font-serif mb-12">Shipping Details</h1>
            
            <form onSubmit={handlePlaceOrder} className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">First Name</label>
                  <input 
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className={`w-full border-b ${errors.firstName ? 'border-red-500' : 'border-zinc-200'} py-2 focus:border-black outline-none transition-colors`} 
                    placeholder="E.g. James"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Last Name</label>
                  <input 
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className={`w-full border-b ${errors.lastName ? 'border-red-500' : 'border-zinc-200'} py-2 focus:border-black outline-none transition-colors`} 
                    placeholder="E.g. Smith"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Email Address</label>
                  <input 
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full border-b ${errors.email ? 'border-red-500' : 'border-zinc-200'} py-2 focus:border-black outline-none transition-colors`} 
                    placeholder="james.smith@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Phone Number</label>
                  <input 
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className={`w-full border-b ${errors.phone ? 'border-red-500' : 'border-zinc-200'} py-2 focus:border-black outline-none transition-colors`} 
                    placeholder="+91 99999 99999"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Full Address</label>
                <input 
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className={`w-full border-b ${errors.address ? 'border-red-500' : 'border-zinc-200'} py-2 focus:border-black outline-none transition-colors`} 
                  placeholder="Street name, landmark, house number"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">City</label>
                  <input 
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className={`w-full border-b ${errors.city ? 'border-red-500' : 'border-zinc-200'} py-2 focus:border-black outline-none transition-colors`} 
                    placeholder="New Delhi"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">State</label>
                  <input 
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    className="w-full border-b border-zinc-200 py-2 focus:border-black outline-none transition-colors" 
                    placeholder="Delhi"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Zip Code</label>
                  <input 
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={handleChange}
                    className={`w-full border-b ${errors.zipCode ? 'border-red-500' : 'border-zinc-200'} py-2 focus:border-black outline-none transition-colors`} 
                    placeholder="110001"
                  />
                </div>
              </div>

              <div className="pt-12">
                <h3 className="text-xl font-serif mb-6">Payment Method</h3>
                <div className="p-6 border border-black bg-zinc-50 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
                      <CreditCard size={18} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold uppercase tracking-widest">Cash on Delivery</p>
                      <p className="text-xs text-zinc-500">Pay when your items arrive</p>
                    </div>
                  </div>
                  <div className="w-5 h-5 rounded-full border-2 border-black flex items-center justify-center">
                    <div className="w-2.5 h-2.5 bg-black rounded-full" />
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Right Column: Summary */}
          <div className="lg:col-span-5">
            <div className="bg-zinc-50 p-8 lg:sticky lg:top-32 border border-zinc-100">
              <h2 className="text-2xl font-serif mb-8 border-b border-zinc-200 pb-4">Order Summary</h2>
              
              <div className="max-h-[300px] overflow-y-auto pr-4 mb-8 space-y-6 scrollbar-none">
                {cartItems.map((item, idx) => (
                  <div key={`checkout-summary-${item.cartItemId}-${idx}`} className="flex gap-4">
                    <div className="w-20 aspect-[3/4] bg-zinc-200 shrink-0">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 flex flex-col justify-between py-1">
                      <div>
                        <h4 className="text-[10px] uppercase tracking-widest font-bold line-clamp-1">{item.name}</h4>
                        <p className="text-xs text-zinc-400 mt-1">Size: {item.size} × {item.quantity}</p>
                      </div>
                      <p className="text-sm font-bold">{formatINR(item.price * item.quantity)}</p>
                    </div>
                  </div>
                ))}
                {cartItems.length === 0 && (
                  <p className="text-zinc-500 text-sm py-4">Your bag is empty.</p>
                )}
              </div>

              <div className="space-y-4 border-t border-zinc-200 pt-6 mb-8">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Subtotal</span>
                  <span>{formatINR(cartSubtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Shipping</span>
                  <span className="text-zinc-900 font-bold uppercase text-[10px] tracking-widest">Complimentary</span>
                </div>
                <div className="flex justify-between text-lg font-serif pt-4 border-t border-zinc-100">
                  <span>Grand Total</span>
                  <span className="font-sans font-bold">{formatINR(cartSubtotal)}</span>
                </div>
              </div>
              
              {orderError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded">
                  {orderError}
                </div>
              )}

              <button 
                onClick={handlePlaceOrder}
                disabled={loading || cartItems.length === 0}
                className="btn-primary w-full py-5 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group transition-all"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <ShoppingBag size={18} className="group-hover:scale-110 transition-transform" />
                    <span>Complete Purchase</span>
                  </>
                )}
              </button>
              
              <p className="text-center text-[9px] uppercase tracking-[0.2em] font-medium text-zinc-400 mt-6">Secure Checkout • No payment upfront</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
