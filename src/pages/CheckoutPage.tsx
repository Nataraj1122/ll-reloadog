import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { formatINR } from '../lib/utils';
import { ShoppingBag, ChevronRight, CheckCircle2, Truck, CreditCard, MessageCircle, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { NotificationService } from '../services/notificationService';
import { load } from '@cashfreepayments/cashfree-js';

export default function CheckoutPage() {
  const { cartItems, cartSubtotal, clearCart } = useAppContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [paymentVerifyError, setPaymentVerifyError] = useState('');
  
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

  const orderIdParam = searchParams.get('order_id');

  // Verify Payment status when returning from Cashfree
  useEffect(() => {
    if (orderIdParam) {
      const verifyPayment = async () => {
        setVerifyingPayment(true);
        setPaymentVerifyError('');
        try {
          console.log(`[CASHFREE CHECKOUT] Verifying payment status for Order ID: ${orderIdParam}`);
          const response = await fetch(`/api/cashfree/get-status?order_id=${orderIdParam}`);
          const text = await response.text();
          let data;
          try {
            data = JSON.parse(text);
          } catch (jsonErr) {
            console.error(`[CASHFREE CHECKOUT] Failed to parse status response as JSON. Status: ${response.status} ${response.statusText}. Response snippet:`, text.slice(0, 500));
            throw new Error(`Server returned invalid response (HTTP ${response.status}): ${text.slice(0, 100)}...`);
          }
          
          if (!response.ok || !data.success) {
            throw new Error(data.message || 'Verification request failed');
          }
          
          if (data.order_status === 'PAID') {
            console.log('[CASHFREE CHECKOUT] Payment confirmed successfully!');
            
            // Retrieve current order from Supabase to trigger email and notifications
            const { data: orderData, error: orderFetchErr } = await supabase
              .from('orders')
              .select('*')
              .eq('order_number', orderIdParam)
              .single();
              
            if (orderFetchErr) {
              console.error('[CASHFREE CHECKOUT] Supabase order retrieval failed:', orderFetchErr);
            }
            
            // 1. Update order status to 'Processing' in Supabase (or 'Paid') and mark as 'Paid via Cashfree'
            const { error: updateError } = await supabase
              .from('orders')
              .update({ status: 'Processing', payment_method: 'Paid via Cashfree' })
              .eq('order_number', orderIdParam);
              
            if (updateError) {
              console.error('[CASHFREE CHECKOUT] Order status update failed:', updateError.message);
            }

            // Delete all previous orders for this user/email to keep only the paid one
            if (orderData) {
              try {
                console.log('[CASHFREE CHECKOUT] Deleting previous order history for customer:', orderData.customer_email);
                
                // Delete previous orders by email
                await supabase
                  .from('orders')
                  .delete()
                  .eq('customer_email', orderData.customer_email)
                  .neq('order_number', orderIdParam);

                // Delete previous orders by user ID if present
                if (orderData.user_id) {
                  await supabase
                    .from('orders')
                    .delete()
                    .eq('user_id', orderData.user_id)
                    .neq('order_number', orderIdParam);
                }
              } catch (delErr) {
                console.error('[CASHFREE CHECKOUT] Failed to clean up previous order history:', delErr);
              }
            }
            
            // 2. Dispatch email and WhatsApp notifications
            if (orderData) {
              const notificationResult = await NotificationService.notifyNewOrder({
                 order_number: orderIdParam,
                 customer_name: orderData.customer_name,
                 customer_email: orderData.customer_email,
                 phone_number: orderData.phone_number,
                 total_amount: orderData.total_amount,
                 shipping_address: orderData.shipping_address,
                 items: orderData.items || []
              });
              setNotified(notificationResult as any);
            }
            
            // 3. Clear cart
            await clearCart();
            
            // 4. Set Success states
            setOrderId(orderIdParam);
            setSuccess(true);
          } else {
            console.warn(`[CASHFREE CHECKOUT] Verification failed. Status is: ${data.order_status}`);
            setPaymentVerifyError(`Payment verification failed. Current Cashfree Order Status is: ${data.order_status || 'UNKNOWN'}. Please try making the purchase again.`);
            // Clear URL params so user is not stuck on a failed verify loop
            setSearchParams({});
          }
        } catch (err: any) {
          console.error('[CASHFREE CHECKOUT] Error during payment verification:', err);
          setPaymentVerifyError(`An error occurred verifying your payment: ${err.message}. If payment succeeded but was not recorded, please contact support with Order ID: ${orderIdParam}.`);
          setSearchParams({});
        } finally {
          setVerifyingPayment(false);
        }
      };
      
      verifyPayment();
    }
  }, [orderIdParam, setSearchParams, clearCart]);

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
    setPaymentVerifyError('');
    
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
      // 4. Strict Pattern/Content Validations
      // Validate Phone Format (between 10 and 12 digits)
      const cleanedPhone = formData.phone.replace(/\D/g, '');
      if (!cleanedPhone || cleanedPhone.length < 10 || cleanedPhone.length > 12) {
        throw new Error(`Invalid phone number format: "${formData.phone}". Please enter a valid 10 to 12 digit phone number (e.g., 9999999999 or +91 99999 99999).`);
      }

      // Validate Email Format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        throw new Error(`Invalid email address format: "${formData.email}". Please enter a valid email address.`);
      }

      // Validate Amount
      if (typeof cartSubtotal !== 'number' || cartSubtotal <= 0) {
        throw new Error(`Invalid grand total amount: ₹${cartSubtotal}. The amount must be greater than zero.`);
      }

      const orderNumber = `RLD-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`;
      
      // Validate Order ID format (must be 3-45 alphanumeric, hyphen, underscore)
      const orderIdRegex = /^[a-zA-Z0-9_-]+$/;
      if (!orderIdRegex.test(orderNumber) || orderNumber.length < 3 || orderNumber.length > 45) {
        throw new Error(`Generated Order ID "${orderNumber}" does not match the required pattern (3-45 chars, alphanumeric/hyphen/underscore).`);
      }

      // Validate Return URL Format
      const returnUrl = `${window.location.origin}/checkout?order_id=${orderNumber}`;
      try {
        const urlObj = new URL(returnUrl);
        if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
          throw new Error(`Unsupported protocol: ${urlObj.protocol}`);
        }
      } catch (urlErr) {
        throw new Error(`Generated Return URL "${returnUrl}" is invalid.`);
      }

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
        phone_number: cleanedPhone, // Save cleaned phone number
        shipping_address: fullAddress,
        zip_code: formData.zipCode,
        items: itemsData,
        total_price: cartSubtotal, 
        payment_method: 'Online (Cashfree)',
        status: 'Pending Payment',
        created_at: new Date().toISOString()
      };

      console.log("[CASHFREE CHECKOUT] Storing order in Supabase with status 'Pending Payment' before payment gateway redirection:", orderPayload);

      // Save order record to Supabase
      const { data: supabaseData, error: supabaseError } = await supabase
        .from('orders')
        .insert([orderPayload])
        .select()
        .single();

      if (supabaseError) {
        console.error("[CASHFREE CHECKOUT] Supabase save error:", supabaseError);
        throw new Error(`Failed to save order record in Database: ${supabaseError.message}`);
      }
      
      // Save notification record to Supabase (graceful fallback)
      try {
        await supabase.from('notifications').insert([{
          order_id: supabaseData.id,
          order_number: orderNumber,
          customer_name: customerName,
          customer_email: formData.email,
          phone_number: cleanedPhone,
          total_amount: cartSubtotal,
          message: `New online payment order initiated by ${customerName}`,
          type: 'new_order'
        }]);
      } catch (nErr) {
        console.warn("Could not save initial notification", nErr);
      }

      // Record direct tracing log
      try {
        await supabase.from('email_logs').insert([{
          order_number: orderNumber,
          customer_email: formData.email,
          status: 'online_payment_initiated',
          created_at: new Date().toISOString()
        }]);
      } catch (logErr) {
        console.warn("[CHECKOUT] Client-side logging failed", logErr);
      }

      // Generate payment session ID from Cashfree Backend
      const apiEndpoint = "/api/cashfree/create-order";
      console.log(`[CASHFREE CHECKOUT] Requesting payment session ID from backend endpoint: ${apiEndpoint}...`);

      const cfSessionResponse = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          order_id: orderNumber,
          order_amount: cartSubtotal,
          customer_details: {
            customer_id: user.id,
            customer_phone: cleanedPhone,
            customer_email: formData.email,
            customer_name: customerName
          },
          return_url: returnUrl
        })
      });

      const cfText = await cfSessionResponse.text();
      let cfData;
      try {
        cfData = JSON.parse(cfText);
      } catch (jsonErr) {
        console.error(`[CASHFREE CHECKOUT] Failed to parse order creation response as JSON. Status: ${cfSessionResponse.status} ${cfSessionResponse.statusText}. Response text:`, cfText);
        throw new Error(`Server returned invalid response (HTTP ${cfSessionResponse.status}): ${cfText.slice(0, 150)}...`);
      }

      if (!cfSessionResponse.ok || !cfData.success) {
        console.error("[CASHFREE CHECKOUT FAIL] Received actual API response failure from server:", cfData);
        if (cfData.error === "CASHFREE_CREDENTIALS_MISSING") {
          throw new Error("Cashfree Credentials Missing: Developer has not set up CASHFREE_CLIENT_ID and CASHFREE_CLIENT_SECRET on the server yet. Please add them under Settings -> Environment Variables.");
        }
        throw new Error(cfData.message || "Failed to create Cashfree order session.");
      }

      // Dynamically load Cashfree client-side SDK based on environment returned by the backend
      const cashEnv = cfData.environment || 'sandbox';
      console.log(`[CASHFREE CHECKOUT] Dynamically initializing Cashfree JS SDK in mode: ${cashEnv}`);
      
      const cashfree = await load({
        mode: cashEnv as 'sandbox' | 'production'
      });

      console.log("[CASHFREE CHECKOUT] Payment session ID acquired. Redirecting user to secure Cashfree Checkout standard overlay...");
      
      // Redirect or overlay Cashfree standard PG UI
      cashfree.checkout({
        paymentSessionId: cfData.payment_session_id,
        redirectTarget: "_self"
      });

    } catch (error: any) {
      console.error("[CASHFREE CHECKOUT] Exception:", error);
      setOrderError(error.message || "An error occurred initiating your online payment transaction. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    const today = new Date();
    const deliveryDate = new Date(today);
    deliveryDate.setDate(today.getDate() + 4);
    const formattedDate = deliveryDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

    const adminPhone = import.meta.env.VITE_ADMIN_PHONE || '919985936088';
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
            <h1 className="text-4xl font-serif mb-4">Order Received</h1>
            <p className="text-zinc-500 mb-6 font-medium">Order <span className="font-mono text-black font-bold">#{orderId.slice(-8).toUpperCase()}</span> is being processed.</p>
            
            {/* WhatsApp Integration - Primary Action */}
            <div className="w-full mb-8">
              <div className="mb-4 text-left px-1">
                <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-900 mb-1">Instant WhatsApp Verification</h3>
                <p className="text-xs text-zinc-500">Tap below to confirm your order details with our team for lightning-fast processing.</p>
              </div>
              <a 
                href={whatsappUrl} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center justify-between w-full p-6 bg-[#25D366] hover:bg-[#20bd5c] text-white rounded-lg transition-all group shadow-xl shadow-green-200/50 border border-white/20 active:scale-[0.98]"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 p-2.5 rounded-full">
                    <MessageCircle size={28} fill="currentColor" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-base uppercase tracking-wider leading-tight">Confirm on WhatsApp</p>
                    <p className="text-[11px] opacity-90 font-medium tracking-wide">Send order breakdown to support</p>
                  </div>
                </div>
                <ArrowRight size={24} className="group-hover:translate-x-2 transition-transform opacity-70" />
              </a>
            </div>

            {/* Notification Status - Refined as a "Next Steps" box */}
            <div className={`mb-10 w-full px-5 py-4 rounded-lg text-xs border ${
              !notified 
                ? 'bg-zinc-50 border-zinc-100 text-zinc-400'
                : notified?.success 
                  ? 'bg-zinc-50 border-zinc-200 text-zinc-600' 
                  : 'bg-zinc-50 border-zinc-200 text-zinc-600'
            }`}>
              {!notified ? (
                <div className="flex items-center justify-center gap-2">
                  <span className="w-2 h-2 bg-zinc-300 rounded-full animate-pulse" />
                  <span className="font-medium">Updating order records...</span>
                </div>
              ) : notified.success ? (
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle2 size={14} className="text-zinc-400" />
                  <span>Confirmation email dispatched to <strong>{formData.email}</strong></span>
                </div>
              ) : (
                <div className="text-left">
                  <div className="flex items-center gap-2 mb-2 font-bold uppercase tracking-widest text-[9px] text-zinc-400">
                    <span className="bg-zinc-200 text-zinc-600 px-1.5 py-0.5 rounded-sm">Info</span>
                    <span>Order Confirmation Status</span>
                  </div>
                  <p className="opacity-90 leading-relaxed">We sent a copy of the receipt to <strong>{formData.email}</strong>. If you don't see it, please ensure you use the WhatsApp button above to confirm your order.</p>
                </div>
              )}
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
                <p className="text-sm font-medium">Online (Cashfree)</p>
              </div>
            </div>

            <Link to="/" className="btn-primary w-full py-5 text-center">Back to Store</Link>
          </motion.div>
        </div>
      </div>
    );
  }

  if (verifyingPayment) {
    return (
      <div className="min-h-screen pt-32 pb-24 bg-white flex items-center justify-center">
        <div className="max-w-md w-full mx-auto px-6 text-center space-y-6">
          <div className="w-16 h-16 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin mx-auto" />
          <h2 className="text-2xl font-serif text-black">Verifying Payment</h2>
          <p className="text-zinc-500 text-sm">Please wait while we confirm your payment status with Cashfree Payments. Do not close or refresh this page.</p>
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
                <div className="p-6 border border-zinc-900 bg-zinc-50 flex items-center justify-between rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center text-white">
                      <CreditCard size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold uppercase tracking-wider text-zinc-900">Online Payment</p>
                      <p className="text-xs text-zinc-500">UPI, Credit/Debit Cards, NetBanking, Wallets via Cashfree</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] uppercase tracking-widest bg-zinc-200 text-zinc-800 px-2 py-1 rounded font-bold">Secured</span>
                    <div className="w-5 h-5 rounded-full border-2 border-zinc-900 flex items-center justify-center">
                      <div className="w-2.5 h-2.5 bg-zinc-900 rounded-full" />
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-zinc-400 mt-3 italic">* Cash on Delivery (COD) has been deactivated. Please complete your payment online using Cashfree for priority processing.</p>
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
              
              {(orderError || paymentVerifyError) && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg shadow-sm">
                  <div className="flex gap-2 font-bold mb-1 items-center">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span>Payment Gateway Authentication Failed</span>
                  </div>
                  <p className="mb-2 text-red-700 leading-relaxed font-medium">
                    Cashfree returned: <code className="bg-red-100/80 px-1.5 py-0.5 rounded text-red-800 font-mono text-[12px]">{orderError || paymentVerifyError}</code>
                  </p>
                  <div className="mt-3 pt-3 border-t border-red-200 text-red-800/90 text-[11px] leading-relaxed space-y-2">
                    <p className="font-semibold text-red-900">Why this happens:</p>
                    <p className="text-red-700">The configured Cashfree Client ID (App ID) or Secret Key does not match the active Cashfree API environment, or Payouts keys were accidentally generated instead of Payment Gateway keys.</p>
                    <p className="font-semibold text-red-900 mt-2">How to solve this:</p>
                    <ol className="list-decimal pl-4 space-y-1 text-red-700">
                      <li>Log in to your <strong>Cashfree Merchant Dashboard</strong>.</li>
                      <li>Click and select the <strong>Payment Gateway</strong> product (do NOT use Payouts, Auto-Collect, or other sections).</li>
                      <li>Go to <strong>Developers</strong> &gt; <strong>API Keys</strong> &gt; click <strong>Generate API Keys</strong>.</li>
                      <li>Copy your new <strong>App ID</strong> and save it as <code className="bg-red-100 px-1 rounded font-mono text-red-800 font-semibold">CASHFREE_CLIENT_ID</code> in Vercel or Settings.</li>
                      <li>Copy your new <strong>Secret Key</strong> and save it as <code className="bg-red-100 px-1 rounded font-mono text-red-800 font-semibold">CASHFREE_CLIENT_SECRET</code>.</li>
                      <li>Set <code className="bg-red-100 px-1 rounded font-mono text-red-800 font-semibold">CASHFREE_ENV</code> to <code className="bg-red-100 px-1 rounded font-mono text-red-800 font-semibold">production</code> if using live keys, or <code className="bg-red-100 px-1 rounded font-mono text-red-800 font-semibold">sandbox</code> if using test keys.</li>
                    </ol>
                  </div>
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
                    <span>Pay with Cashfree</span>
                  </>
                )}
              </button>
              
              <p className="text-center text-[9px] uppercase tracking-[0.2em] font-medium text-zinc-400 mt-6">Secure Checkout • SSL Encrypted Payments</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
