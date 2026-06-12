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

  const { order_number, customer_name, customer_email, phone_number, total_amount, shipping_address, type, status } = req.body;

  try {
    console.log("[VERCEL API] Request received:", { order_number, type });
    await logEmailStep(order_number || 'UNKNOWN', customer_email || 'UNKNOWN', `vercel_func_reached (${type})`);

    if (!process.env.RESEND_API_KEY) {
      const msg = "RESEND_API_KEY is missing in Vercel environment";
      await logEmailStep(order_number, customer_email, 'failed', msg);
      return res.status(500).json({ error: msg });
    }

    const adminEmail = "reloadwebsite172@gmail.com";
    const defaultSender = "onboarding@resend.dev";

    if (type === 'new_order') {
        // Customer Email
        await logEmailStep(order_number, customer_email, 'attempted_customer');
        const customerResult = await resend.emails.send({
          from: `Reload Store <${defaultSender}>`,
          to: customer_email,
          subject: `Order Confirmation - ${order_number}`,
          html: `<h3>Thank you for your order, ${customer_name}!</h3><p>Order ${order_number} confirmed.</p>`
        });
        if (customerResult.error) {
          await logEmailStep(order_number, customer_email, 'failed_customer', customerResult.error.message, customerResult.error);
        } else {
          await logEmailStep(order_number, customer_email, 'sent_customer', undefined, customerResult.data);
        }

        // Admin Email
        await logEmailStep(order_number, adminEmail, 'attempted_admin');
        const adminResult = await resend.emails.send({
          from: `Store System <${defaultSender}>`,
          to: adminEmail,
          subject: `NEW ORDER - ${order_number}`,
          text: `New order: ${order_number} from ${customer_name}`
        });
        if (adminResult.error) {
          await logEmailStep(order_number, adminEmail, 'failed_admin', adminResult.error.message, adminResult.error);
        } else {
          await logEmailStep(order_number, adminEmail, 'sent_admin', undefined, adminResult.data);
        }
    }

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("[VERCEL API] Crash:", err);
    return res.status(500).json({ error: err.message });
  }
}
