import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);
const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://hnhyyucdpnjzepbvsldy.supabase.co";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuaHl5dWNkcG5qemVwYnZzbGR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5Njk0MjYsImV4cCI6MjA5MzU0NTQyNn0._W6FNTVBQQdaEVjDtENezy3D6qZ2nufmP4iuxjrpznA";
const supabase = createClient(supabaseUrl, supabaseKey);

const logEmailStep = async (orderNumber: string, email: string, status: string, error?: string, info?: any) => {
  console.log(`[VERCEL API] Step: ${status} | Order: ${orderNumber} | Email: ${email}`);
  try {
    await supabase.from('email_logs').insert([{
      order_number: orderNumber,
      customer_email: email,
      status: status,
      error_message: error || null,
      metadata: info || null,
      created_at: new Date().toISOString()
    }]);
  } catch (err) {
    console.error("[VERCEL API] DB Log Failure:", err);
  }
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { order_number, customer_name, customer_email, phone_number, total_amount, shipping_address, items, type, status } = req.body;

  try {
    console.log("[VERCEL API] Request received:", { order_number, type });
    await logEmailStep(order_number || 'UNKNOWN', customer_email || 'UNKNOWN', `vercel_func_reached (${type})`);

    if (!process.env.RESEND_API_KEY) {
      const msg = "RESEND_API_KEY is missing in Vercel environment";
      await logEmailStep(order_number, customer_email, 'failed', msg);
      return res.status(500).json({ error: msg });
    }

    const adminEmail = "reloadwebsite172@gmail.com";
    const defaultSender = "orders@reloadfashion.in";

    if (type === 'new_order') {
        const productListStr = items && Array.isArray(items) ? items.map((item: any) => `- ${item.productName || item.name || 'Item'} (x${item.quantity || 1})`).join('\n') : 'Items not specified';
        const paymentMethod = req.body.payment_method || 'COD';

        // Customer Email
        await logEmailStep(order_number, customer_email, 'attempted_customer');
        const customerResult = await resend.emails.send({
          from: `Reload Fashion <${defaultSender}>`,
          to: customer_email,
          subject: `Order Confirmation - ${order_number}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
              <h2 style="color: #000;">Thank you for your order, ${customer_name}!</h2>
              <p>We've received your order and are processing it now.</p>
              <div style="background: #f9f9f9; padding: 15px; margin: 20px 0;">
                <p><strong>Order Number:</strong> ${order_number}</p>
                <p><strong>Total Amount:</strong> ₹${total_amount}</p>
                <p><strong>Shipping Address:</strong> ${shipping_address}</p>
                <p><strong>Payment Method:</strong> ${paymentMethod}</p>
              </div>
              <p>We'll notify you as soon as your items ship.</p>
              <hr />
              <p style="font-size: 12px; color: #888;">Reload Store • Premium Experience</p>
            </div>
          `
        });
        if (customerResult.error) {
          await logEmailStep(order_number, customer_email, 'failed_customer', customerResult.error.message, customerResult.error);
          return res.status(500).json({ 
            success: false, 
            error: customerResult.error.message,
            code: (customerResult.error as any).code || 'RESEND_ERROR'
          });
        } else {
          await logEmailStep(order_number, customer_email, 'sent_customer', undefined, customerResult.data);
        }

        // Admin Email
        const adminEmailContent = `New Order Received - ${phone_number || order_number}

Order Number: ${order_number}
Customer Name: ${customer_name}
Phone Number: ${phone_number}
Email: ${customer_email}

Products Ordered:
${productListStr}

Total Amount: ₹${total_amount}
Shipping Address: ${shipping_address}
Payment Method: ${paymentMethod}
`;

        await logEmailStep(order_number, adminEmail, 'attempted_admin');
        const adminResult = await resend.emails.send({
          from: `Reload Fashion <${defaultSender}>`,
          to: adminEmail,
          subject: `New Order Received - ${phone_number || order_number}`,
          text: adminEmailContent
        });
        if (adminResult.error) {
          await logEmailStep(order_number, adminEmail, 'failed_admin', adminResult.error.message, adminResult.error);
        } else {
          await logEmailStep(order_number, adminEmail, 'sent_admin', undefined, adminResult.data);
        }

        // WhatsApp to Admin
        const adminPhone = "+919985936088";
        const whatsappMessage = `🛒 *New Order Received*

*Order:* ${order_number}
*Customer:* ${customer_name}
*Phone:* ${phone_number}
*Amount:* ₹${total_amount}

*Products:*
${productListStr}

*Address:*
${shipping_address}

*Payment:*
${paymentMethod}`;

        console.log(`[WHATSAPP] Attempting to send WhatsApp message to ${adminPhone}`);
        if (process.env.WHATSAPP_API_URL) {
          try {
            await fetch(process.env.WHATSAPP_API_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.WHATSAPP_API_KEY || ''}`
              },
              body: JSON.stringify({ phone: adminPhone, message: whatsappMessage })
            });
            console.log("[WHATSAPP] Message sent via API");
          } catch (waErr: any) {
            console.error("[WHATSAPP] Failed via API:", waErr.message);
          }
        } else {
          console.log("[WHATSAPP] API URL not configured.");
        }
    }

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("[VERCEL API] Crash:", err);
    return res.status(500).json({ error: err.message });
  }
}
