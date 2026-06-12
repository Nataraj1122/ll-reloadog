import express from "express";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Initialize Supabase Admin for logging
const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://hnhyyucdpnjzepbvsldy.supabase.co";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuaHl5dWNkcG5qemVwYnZzbGR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5Njk0MjYsImV4cCI6MjA5MzU0NTQyNn0._W6FNTVBQQdaEVjDtENezy3D6qZ2nufmP4iuxjrpznA";
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

if (!process.env.RESEND_API_KEY) {
  console.error("[RESEND] ERROR: RESEND_API_KEY environment variable is missing!");
} else {
  console.log("[RESEND] Client initialized");
}

/**
 * Helper to log detailed email sending information to console and DB.
 */
const logEmailStep = async (orderNumber: string, email: string, status: string, error?: string, info?: any) => {
  console.log(`[EMAIL STEP] Order: ${orderNumber} | Recipient: ${email} | Status: ${status}`);
  if (error) console.error(`[EMAIL ERROR] Details: ${error}`);
  if (info) console.log(`[RESEND RESPONSE]`, JSON.stringify(info, null, 2));

  try {
    const { error: logError } = await supabase.from('email_logs').insert([{
      order_number: orderNumber,
      customer_email: email,
      status: status,
      error_message: error || null,
      metadata: info || null,
      created_at: new Date().toISOString()
    }]);
    
    if (logError) {
      console.warn("[DB LOGGING FAILED] Could not write to email_logs table:", logError.message);
    }
  } catch (err) {
    console.warn("[DB LOGGING CRASHED] Error during log insertion:", err);
  }
};

/**
 * Test Route: Verify email sending logic immediately
 */
app.post("/api/test-email", async (req, res) => {
  const testTarget = "reloadwebsite172@gmail.com";
  const sender = "orders@reloadfashion.in";
  const testOrderNumber = "TEST-" + Date.now();
  
  console.log(`[Test Email] Initiating test to ${testTarget}`);
  await logEmailStep(testOrderNumber, testTarget, 'attempted');
  
  try {
    const { data, error } = await resend.emails.send({
      from: `Reload Fashion <${sender}>`,
      to: testTarget,
      subject: "Resend Test Email",
      text: "This is a test email to verify your Resend configuration works correctly.",
      html: "<h3>Resend Configuration Test</h3><p>If you see this, your Resend integration is working perfectly!</p>"
    });
    
    if (error) throw error;

    await logEmailStep(testOrderNumber, testTarget, 'sent', undefined, data);
    res.json({ success: true, deliveryId: data?.id, response: data });
  } catch (err: any) {
    console.error("EMAIL ERROR (Test Route):", err.message);
    await logEmailStep(testOrderNumber, testTarget, 'failed', err.message);
    res.status(500).json({ 
      success: false, 
      error: err.message, 
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined 
    });
  }
});

// Notifications API handler function
const handleOrderEmail = async (req, res) => {
  console.log("-----------------------------------------");
  console.log("[TRACE: BACKEND] STEP 1: API Route Entry hit /api/send-order-email");
  console.log("[TRACE: BACKEND] Method:", req.method);
  
  const { order_number, customer_name, customer_email, phone_number, total_amount, shipping_address, items, type, status } = req.body;

  try {
    console.log("[TRACE: BACKEND] STEP 2: Body Parsed", { order_number, customer_email, type });
    
    if (!customer_email) {
      console.warn("[TRACE: BACKEND ERROR] Missing customer_email in body");
      return res.status(400).json({ 
        success: false, 
        error: "customer_email is required",
        received_body: req.body 
      });
    }

    // IMMEDIATE TRACING: Prove the server function is executing
    console.log("[TRACE: BACKEND] STEP 3: Attempting first Supabase insert to email_logs...");
    const traceLog = {
      order_number: order_number || 'UNKNOWN',
      customer_email: customer_email,
      status: `server_reached_${type}`,
      created_at: new Date().toISOString(),
      metadata: { body: req.body }
    };

    try {
      const { error: dbErr } = await supabase.from('email_logs').insert([traceLog]);
      if (dbErr) {
        console.error("[TRACE: BACKEND ERROR] Supabase rejected initial log:", dbErr.message);
      } else {
        console.log("[TRACE: BACKEND] STEP 4: Initial log insert successful");
      }
    } catch (crashErr: any) {
      console.error("[TRACE: BACKEND ERROR] Supabase client crashed during initial log:", crashErr.message);
    }

    if (!process.env.RESEND_API_KEY) {
      const msg = "MISSING RESEND_API_KEY on server environment variables";
      console.error("[SERVER]", msg);
      await logEmailStep(order_number || 'UNKNOWN', customer_email, 'failed', msg);
      return res.status(500).json({ error: msg });
    }

    const adminEmail = "reloadwebsite172@gmail.com"; 
    const defaultSender = "orders@reloadfashion.in"; 

    if (type === 'new_order') {
        // Log Attempt - Customer
        await logEmailStep(order_number, customer_email, 'attempted (Customer Confirmation)');

        // 1. Email to Customer
        const { data, error } = await resend.emails.send({
          from: `Reload Fashion <${defaultSender}>`,
          to: customer_email,
          subject: `Order Confirmation - ${order_number}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
              <h2 style="color: #000;">Thank you for your order, ${customer_name}!</h2>
              <p>We've received your order and are processing it now.</p>
              <div style="background: #f9f9f9; padding: 15px; margin: 20px 0;">
                <p><strong>Order Number:</strong> ${order_number}</p>
                <p><strong>Total Amount:</strong> Rs. ${total_amount}</p>
                <p><strong>Shipping Address:</strong> ${shipping_address}</p>
              </div>
              <p>We'll notify you as soon as your items ship.</p>
              <hr />
              <p style="font-size: 12px; color: #888;">Reload Store • Premium Experience</p>
            </div>
          `
        });
        
        if (error) {
          await logEmailStep(order_number, customer_email, 'failed (Customer Confirmation)', error.message, error);
          return res.status(500).json({ 
            success: false, 
            error: error.message,
            message: "Resend failed to send customer email. This often happens in test mode if the recipient is not verified."
          });
        }
        await logEmailStep(order_number, customer_email, 'sent (Customer Confirmation)', undefined, data);

        // 2. Email to Admin
        const { data: adminData, error: adminError } = await resend.emails.send({
          from: `Reload Fashion <${defaultSender}>`,
          to: adminEmail,
          subject: `NEW ORDER ALERT - ${order_number}`,
          text: `
NEW ORDER ALERT
-------------------------------
Order Number: ${order_number}
Customer: ${customer_name}
Email: ${customer_email}
Phone: ${phone_number}
Total: Rs. ${total_amount}
Address: ${shipping_address}
-------------------------------
Check admin dashboard for details.
          `,
        });
        
        if (adminError) {
          await logEmailStep(order_number, adminEmail, 'failed (Admin Alert)', adminError.message, adminError);
          // Don't fail the whole request if only admin alert fails
        } else {
          await logEmailStep(order_number, adminEmail, 'sent (Admin Alert)', undefined, adminData);
        }
    } else if (type === 'status_update') {
        await logEmailStep(order_number, customer_email, `attempted (Status: ${status})`);
        try {
          const { data, error } = await resend.emails.send({
            from: `Reload Fashion <${defaultSender}>`,
            to: customer_email,
            subject: `Order Update - ${order_number}`,
            text: `Hi ${customer_name},\n\nYour order ${order_number} status has been updated to: ${status}.\n\nBest,\nReload Store Team`
          });
          
          if (error) {
            await logEmailStep(order_number, customer_email, `failed (Status: ${status})`, error.message, error);
            throw error;
          }
          await logEmailStep(order_number, customer_email, `sent (Status: ${status})`, undefined, data);
        } catch (err: any) {
          console.error("FAILURE: Error sending status update email:", err.message);
        }
    }

    return res.json({ success: true, message: "Notification process completed" });
  } catch (err: any) {
    console.error("CRITICAL SERVER ERROR:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

// Define endpoints properly
app.post("/api/send-order-email", handleOrderEmail);
app.post("/api/notifications/order", handleOrderEmail);

// Health check / Debug route
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    time: new Date().toISOString(),
    env: process.env.NODE_ENV,
    resendConfigured: !!process.env.RESEND_API_KEY
  });
});


async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
