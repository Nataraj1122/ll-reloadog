import express from "express";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Set up Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS?.replace(/\s+/g, ''), // Strip spaces if user pasted "abcd efgh ..."
  },
  debug: true, // Enable debug output
  logger: true // Log internal messages to console
});

// Verify connection configuration
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  console.log(`[SMTP] Attempting to verify connection for user: ${process.env.SMTP_USER}`);
  transporter.verify((error, success) => {
    if (error) {
      console.error("[SMTP] CRITICAL: Connection verification failed!");
      console.error("[SMTP] Error Message:", error.message);
      console.error("[SMTP] Full Error Object:", JSON.stringify(error, null, 2));
      console.log("[SMTP] Recommended Steps:");
      console.log(" 1. Check if 'Less Secure Apps' is ON (not recommended) OR use an 'App Password'.");
      console.log(" 2. Ensure SMTP_USER matches your Gmail exactly.");
      console.log(" 3. Ensure SMTP_PASS is a 16-character App Password.");
    } else {
      console.log("[SMTP] SUCCESS: Server is ready to take our messages");
    }
  });
} else {
  console.error("[SMTP] ERROR: SMTP_USER or SMTP_PASS environment variables are missing!");
}

/**
 * Helper to log detailed email sending information as requested.
 */
const logEmailInfo = (label: string, info: any, sender: string, recipient: string) => {
  console.log(`-------------------------------------------------`);
  console.log(`[EMAIL LOG: ${label}]`);
  console.log(`Sender: ${sender}`);
  console.log(`Recipient: ${recipient}`);
  console.log(`MessageId: ${info.messageId}`);
  console.log(`Accepted: ${JSON.stringify(info.accepted)}`);
  console.log(`Rejected: ${JSON.stringify(info.rejected)}`);
  console.log(`Full Response:`, JSON.stringify(info, null, 2));
  console.log(`-------------------------------------------------`);
};

/**
 * Test Route: Verify email sending logic immediately
 */
app.post("/api/test-email", async (req, res) => {
  const testTarget = "reloadwebsite172@gmail.com";
  const sender = process.env.SMTP_USER || "unknown";
  console.log(`[Test Email] Initiating test to ${testTarget}`);
  
  try {
    const info = await transporter.sendMail({
      from: `"Reload Store Test" <${sender}>`,
      to: testTarget,
      subject: "STMP Test Email",
      text: "This is a test email to verify your SMTP configuration works correctly.",
      html: "<h3>SMTP Configuration Test</h3><p>If you see this, your email server is working perfectly!</p>"
    });
    
    logEmailInfo("Test Route", info, sender, testTarget);
    res.json({ success: true, messageId: info.messageId, response: info.response });
  } catch (err: any) {
    console.error("EMAIL ERROR (Test Route):", err.message);
    res.status(500).json({ 
      success: false, 
      error: err.message, 
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined 
    });
  }
});

// Notifications API handler function
const handleOrderEmail = async (req, res) => {
  try {
    console.log("[SERVER] Received notification request:", req.url, "Method:", req.method);
    console.log("[SERVER] Payload:", JSON.stringify(req.body, null, 2));

    const { order_number, customer_name, customer_email, phone_number, total_amount, shipping_address, items, type, status } = req.body;
    
    if (!customer_email) {
      console.warn("[API ERROR] Missing customer_email in request body");
      return res.status(400).json({ error: "customer_email is required" });
    }

    const adminEmail = "reloadwebsite172@gmail.com"; 

    if (type === 'new_order') {
        console.log(`[Notification] Processing NEW ORDER: ${order_number} for CUSTOMER: ${customer_email}`);

        // 1. Email to Customer
        try {
          const sender = process.env.SMTP_USER || "unknown";
          const info = await transporter.sendMail({
            from: `"Reload Store" <${sender}>`,
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
          logEmailInfo("Customer Confirmation", info, sender, customer_email);
        } catch (err: any) {
          console.error("FAILURE: Error sending Customer email:", err.message);
          if (err.message.includes('auth') || err.message.includes('login')) {
            console.error("[SMTP AUTH] Gmail authentication failed. Ensure you use an APP PASSWORD.");
          }
        }

        // 2. Email to Admin
        try {
          const sender = process.env.SMTP_USER || "unknown";
          const info = await transporter.sendMail({
            from: `"Store System" <${sender}>`,
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
          logEmailInfo("Admin Alert", info, sender, adminEmail);
        } catch (err: any) {
          console.error("FAILURE: Error sending Admin email:", err.message);
        }
    } else if (type === 'status_update') {
        console.log(`[Notification] Processing STATUS UPDATE for: ${order_number} to ${status}`);
        try {
          const sender = process.env.SMTP_USER || "unknown";
          const info = await transporter.sendMail({
            from: `"Reload Store" <${sender}>`,
            to: customer_email,
            subject: `Order Update - ${order_number}`,
            text: `Hi ${customer_name},\n\nYour order ${order_number} status has been updated to: ${status}.\n\nBest,\nReload Store Team`
          });
          logEmailInfo("Status Update", info, sender, customer_email);
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
    smtpConfigured: !!(process.env.SMTP_USER && process.env.SMTP_PASS)
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
