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

        const productListStr = items && Array.isArray(items) ? items.map((item: any) => `- ${item.productName || item.name || 'Item'} (x${item.quantity || 1})`).join('\n') : 'Items not specified';
        const paymentMethod = req.body.payment_method || 'COD';

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

        const { data: adminData, error: adminError } = await resend.emails.send({
          from: `Reload Fashion <${defaultSender}>`,
          to: adminEmail,
          subject: `New Order Received - ${phone_number || order_number}`,
          text: adminEmailContent,
        });
        
        if (adminError) {
          await logEmailStep(order_number, adminEmail, 'failed (Admin Alert)', adminError.message, adminError);
          // Don't fail the whole request if only admin alert fails
        } else {
          await logEmailStep(order_number, adminEmail, 'sent (Admin Alert)', undefined, adminData);
        }

        // 3. Automatically send a WhatsApp message to Admin
        const adminPhone = "+919985936088"; // Specific number from user instructions
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
        console.log(`[WHATSAPP] Message payload:\n${whatsappMessage}`);
        
        if (process.env.WHATSAPP_API_URL) {
          try {
            await fetch(process.env.WHATSAPP_API_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.WHATSAPP_API_KEY || ''}`
              },
              body: JSON.stringify({
                phone: adminPhone,
                message: whatsappMessage
              })
            });
            console.log("[WHATSAPP] Message sent successfully via API");
          } catch (waErr: any) {
            console.error("[WHATSAPP] Failed to send message via API", waErr.message);
          }
        } else {
          console.log("[WHATSAPP] WHATSAPP_API_URL not configured. API call skipped. Consider integrating a provider like Twilio, Interakt, or WATI.");
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

// Cashfree: Create Order Endpoint
app.post("/api/cashfree/create-order", async (req, res) => {
  const { order_id, order_amount, customer_details, return_url } = req.body;
  
  const clientId = process.env.CASHFREE_CLIENT_ID;
  const clientSecret = process.env.CASHFREE_CLIENT_SECRET;
  const isProd = process.env.CASHFREE_ENV === "production";
  const url = isProd 
    ? "https://api.cashfree.com/pg/orders" 
    : "https://sandbox.cashfree.com/pg/orders";

  console.log(`[CASHFREE] Creating order session. ID: ${order_id}, Env: ${process.env.CASHFREE_ENV || "sandbox"}`);

  if (!clientId || !clientSecret) {
    console.warn("[CASHFREE] ERROR: CASHFREE_CLIENT_ID or CASHFREE_CLIENT_SECRET is missing!");
    return res.status(400).json({
      success: false,
      error: "CASHFREE_CREDENTIALS_MISSING",
      message: "Cashfree Payment Gateway is not configured yet. Please configure CASHFREE_CLIENT_ID and CASHFREE_CLIENT_SECRET in the settings/environment variables."
    });
  }

  try {
    const cfResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": clientId,
        "x-client-secret": clientSecret,
        "x-api-version": "2023-08-01"
      },
      body: JSON.stringify({
        order_id: order_id,
        order_amount: parseFloat(order_amount).toFixed(2),
        order_currency: "INR",
        customer_details: {
          customer_id: customer_details.customer_id || `cust_${Date.now()}`,
          customer_phone: customer_details.customer_phone.replace(/\D/g, '').slice(-10) || "9999999999",
          customer_email: customer_details.customer_email || "customer@example.com",
          customer_name: customer_details.customer_name || "Guest Customer"
        },
        order_meta: {
          return_url: return_url
        }
      })
    });

    const data: any = await cfResponse.json();

    if (!cfResponse.ok) {
      console.error("[CASHFREE API ERROR RESPONSE]:", data);
      return res.status(cfResponse.status).json({
        success: false,
        error: "CASHFREE_API_ERROR",
        message: data.message || "Failed to create order on Cashfree PG",
        details: data
      });
    }

    console.log(`[CASHFREE] Order session generated: ${data.payment_session_id}`);
    return res.json({
      success: true,
      payment_session_id: data.payment_session_id,
      cf_order_id: data.cf_order_id,
      order_status: data.order_status
    });
  } catch (error: any) {
    console.error("[CASHFREE EXCEPTION]:", error.message);
    return res.status(500).json({
      success: false,
      error: "CASHFREE_SERVER_EXCEPTION",
      message: error.message
    });
  }
});

// Cashfree: Retrieve Order Status Endpoint
app.get("/api/cashfree/get-status", async (req, res) => {
  const { order_id } = req.query;

  if (!order_id) {
    return res.status(400).json({ success: false, error: "Missing order_id" });
  }

  const clientId = process.env.CASHFREE_CLIENT_ID;
  const clientSecret = process.env.CASHFREE_CLIENT_SECRET;
  const isProd = process.env.CASHFREE_ENV === "production";
  const url = isProd 
    ? `https://api.cashfree.com/pg/orders/${order_id}` 
    : `https://sandbox.cashfree.com/pg/orders/${order_id}`;

  if (!clientId || !clientSecret) {
    return res.status(400).json({
      success: false,
      error: "CASHFREE_CREDENTIALS_MISSING",
      message: "Cashfree credentials are not configured on the server."
    });
  }

  try {
    const cfResponse = await fetch(url, {
      method: "GET",
      headers: {
        "x-client-id": clientId,
        "x-client-secret": clientSecret,
        "x-api-version": "2023-08-01"
      }
    });

    const data: any = await cfResponse.json();

    if (!cfResponse.ok) {
      console.error("[CASHFREE STATUS API ERRORRESPONSE]:", data);
      return res.status(cfResponse.status).json({
        success: false,
        error: "CASHFREE_API_ERROR",
        message: data.message || "Failed to check order status from Cashfree PG"
      });
    }

    console.log(`[CASHFREE] Verified status for order ${order_id}:`, data.order_status);
    return res.json({
      success: true,
      order_status: data.order_status,
      order_amount: data.order_amount,
      payment_session_id: data.payment_session_id
    });
  } catch (error: any) {
    console.error("[CASHFREE STATUS EXCEPTION]:", error.message);
    return res.status(500).json({
      success: false,
      error: "CASHFREE_SERVER_EXCEPTION",
      message: error.message
    });
  }
});

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
