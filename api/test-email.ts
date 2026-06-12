import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);
const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://hnhyyucdpnjzepbvsldy.supabase.co";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuaHl5dWNkcG5qemVwYnZzbGR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5Njk0MjYsImV4cCI6MjA5MzU0NTQyNn0._W6FNTVBQQdaEVjDtENezy3D6qZ2nufmP4iuxjrpznA";
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: any, res: any) {
  const testTarget = "reloadwebsite172@gmail.com";
  const sender = "onboarding@resend.dev";
  const orderNum = "TEST-VERCEL-" + Date.now();

  try {
    console.log("[VERCEL TEST] Sending to", testTarget);
    
    const { data, error } = await resend.emails.send({
      from: `Vercel Test <${sender}>`,
      to: testTarget,
      subject: "Vercel Serverless Test",
      html: "<p>If you see this, Vercel Serverless Functions are working!</p>"
    });

    if (error) throw error;

    await supabase.from('email_logs').insert([{
      order_number: orderNum,
      customer_email: testTarget,
      status: 'sent_from_vercel_test',
      metadata: data
    }]);

    return res.status(200).json({ success: true, data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
