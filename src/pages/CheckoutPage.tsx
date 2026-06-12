import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { formatINR } from '../lib/utils';
import { ShoppingBag, ChevronRight, CheckCircle2, Truck, CreditCard, MessageCircle, ArrowRight } from 'lucide-react';
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

      const orderPayload = {
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
      };

      console.log("[TRACE: SUPABASE] Sending Payload:", orderPayload);

      // SEND TO SUPABASE
      const supabaseResponse = await supabase
        .from('orders')
        .insert([orderPayload])
        .select()
        .single();

      const { data: supabaseData, error: supabaseError } = supabaseResponse;

      if (supabaseError) {
        console.error("[SUPABASE ERROR]", supabaseError);
        throw new Error(supabaseError.message);
      }
      
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
        console.warn("Could not save notification to Supabase.", notificationError);
      }

      // TRACING: Direct insert into email_logs from client to verify visibility
      try {
        await supabase.from('email_logs').insert([{
          order_number: orderNumber,
          customer_email: formData.email,
          status: 'order_confirmed_client',
          created_at: new Date().toISOString()
        }]);
      } catch (logErr) {
        console.warn("[CHECKOUT] Client-side logging failed", logErr);
      }

      // Call notification service for email/whatsapp
      const notificationResult = await NotificationService.notifyNewOrder({
         order_number: orderNumber,
         customer_name: customerName,
         customer_email: formData.email,
         phone_number: formData.phone,
         total_amount: cartSubtotal,
         shipping_address: fullAddress,
         items: itemsData
      });
      
      setNotified(notificationResult as any);
      
      setOrderId(orderNumber);
      await clearCart();
      setSuccess(true);
      
    } catch (error: any) {
      console.error("Error during order placement:", error);
      const errorMessage = error.message || JSON.stringify(error);
      setOrderError(`Failed to place order: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    const today = new Date();
    const deliveryDate = new Date(today);
    deliveryDate.setDate(today.getDate() + 4);
    const formattedDate = deliveryDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

    const adminPhone = import.meta.env.VITE_ADMIN_PHONE || '919999999999';
    const whatsappMessage = encodeURIComponent(`Hi, I just placed an order on Reload Store!\n\nOrder ID: ${orderId}\nCustomer: ${formData.firstName} ${formData.lastName}\nTotal: ${formatINR(cartSubtotal)}\n\nPlease confirm my order. Thanks!`);
    const whatsappUrl = `https://wa.me/${adminPhone.replace(/\D/g, '')}?text=${whatsappMessage}`;

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
            <p className="text-zinc-500 mb-2">Thank you for your purchase. Your order <span className="font-mono text-black font-bold">#{orderId.slice(-8).toUpperCase()}</span> has been placed.</p>
            
            {/* Notification Status */}
            <div className={`mt-4 mb-4 w-full px-4 py-4 rounded-sm text-xs border ${
              !notified 
                ? 'bg-zinc-50 border-zinc-100 text-zinc-400'
                : notified?.success 
                  ? 'bg-zinc-50 border-zinc-100 text-zinc-600' 
                  : 'bg-red-50 border-red-100 text-red-600'
            }`}>
              {!notified ? (
                <div className="flex items-center justify-center gap-2">
                  <span className="w-2 h-2 bg-zinc-400 rounded-full animate-pulse" />
                  <span>Finalizing your order...</span>
                </div>
              ) : notified.success ? (
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle2 size={14} className="text-green-600" />
                  <span>Confirmation email sent to <strong>{formData.email}</strong></span>
                </div>
              ) : (
                <div className="text-left">
                  <div className="flex items-center gap-2 mb-2 font-bold uppercase tracking-widest text-[9px]">
                    <span className="bg-red-600 text-white px-1.5 py-0.5 rounded-sm">Action Required</span>
                    <span>Order Confirmation Delay</span>
                  </div>
                  <p className="opacity-90 leading-relaxed mb-2">We couldn't deliver the confirmation email to <strong>{formData.email}</strong>. This usually happens in testing mode when the email is not verified.</p>
                  <p className="font-bold text-black border-t border-red-200 mt-2 pt-2">Please tap the WhatsApp button below to confirm your order immediately.</p>
                </div>
              )}
            </div>

            {/* WhatsApp Integration */}
            <div className="w-full mb-12">
              <div className="mb-4 text-left">
                <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-400 mb-2">Instant Confirmation</h3>
                <p className="text-xs text-zinc-500">Tap below to notify our team on WhatsApp for lightning-fast processing.</p>
              </div>
              <a 
                href={whatsappUrl} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center justify-between w-full p-6 bg-[#25D366] hover:bg-[#20bd5c] text-white rounded-lg transition-all group shadow-xl shadow-green-100/50 border border-white/10"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 p-2.5 rounded-full animate-bounce">
                    <MessageCircle size={28} fill="currentColor" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-base uppercase tracking-wider">Confirm on WhatsApp</p>
                    <p className="text-[11px] opacity-90 font-medium">Verify your order # {orderId.slice(-8).toUpperCase()}</p>
                  </div>
                </div>
                <ArrowRight size={24} className="group-hover:translate-x-2 transition-transform" />
              </a>
            </div>
            
            <div className="w-full grid grid-cols-2 gap-4 mb-12">
              <div className="bg-zinc-50 p-6 rounded-lg text-left border border-zinc-100">
                <div className="flex items-center gap-3 mb-2 text-[9px] uppercase tracking-widest font-bold text-zinc-400">
                  <Truck size={12} />
                  <span>Estimated Delivery</span>
                </div>
                <p className="text-sm font-medium">{formattedDate}</p>
              </div>
              <div className="bg-zinc-50 p-6 rounded-lg text-left border border-zinc-100">
                <div className="flex items-center gap-3 mb-2 text-[9px] uppercase tracking-widest font-bold text-zinc-400">
                  <CreditCard size={12} />
                  <span>Payment</span>
                </div>
                <p className="text-sm font-medium">Cash on Delivery</p>
              </div>
            </div>

            <Link to="/" className="btn-primary w-full py-5 text-center">Back to Store</Link>
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
