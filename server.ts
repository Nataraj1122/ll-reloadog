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
 * Test Route: Verify email sending logic immediately
 */
app.post("/api/test-email", async (req, res) => {
  const testTarget = "reloadwebsite172@gmail.com";
  console.log(`[Test Email] Initiating test to ${testTarget}`);
  
  try {
    const info = await transporter.sendMail({
      from: `"Reload Store Test" <${process.env.SMTP_USER}>`,
      to: testTarget,
      subject: "STMP Test Email",
      text: "This is a test email to verify your SMTP configuration works correctly.",
      html: "<h3>SMTP Configuration Test</h3><p>If you see this, your email server is working perfectly!</p>"
    });
    
    console.log("EMAIL SENT SUCCESSFULLY (Test Route)", info.messageId);
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

// Notifications API
app.post("/api/send-order-email", async (req, res) => {
  try {
    console.log("[API] Incoming request for /api/send-order-email");
    const { order_number, customer_name, customer_email, phone_number, total_amount, shipping_address, items, type, status } = req.body;
    
    if (!customer_email) {
      console.warn("[API] Missing customer_email in request body");
      return res.status(400).json({ error: "customer_email is required" });
    }

    const adminEmail = "reloadwebsite172@gmail.com"; // Requested specific admin email

    if (type === 'new_order') {
        console.log(`[Notification] Processing NEW ORDER: ${order_number} for ${customer_email}`);

        // 1. Email to Customer
        try {
          const info = await transporter.sendMail({
            from: `"Reload Store" <${process.env.SMTP_USER}>`,
            to: customer_email,
            subject: `Order Confirmation - ${order_number}`,
            html: `<h3>Thank you for your order, ${customer_name}!</h3>
                   <p><strong>Order Number:</strong> ${order_number}</p>
                   <p><strong>Total:</strong> Rs. ${total_amount}</p>
                   <p><strong>Shipping to:</strong> ${shipping_address}</p>
                   <p>We'll notify you when it ships.</p>`
          });
          console.log("EMAIL SENT SUCCESSFULLY to Customer:", info.messageId);
        } catch (err: any) {
          console.error("EMAIL ERROR (Customer):", err.message);
          // Log specific authentication errors if they occur
          if (err.message.includes('Invalid login') || err.message.includes('auth')) {
             console.error("[SMTP] Authentication Failure detected. Check App Password.");
          }
        }

        // 2. Email to Admin
        try {
          const info = await transporter.sendMail({
            from: `"Store System" <${process.env.SMTP_USER}>`,
            to: adminEmail,
            subject: `New Order Alert - ${order_number}`,
            text: `New Alert!\nOrder Number: ${order_number}\nCustomer: ${customer_name}\nTotal: Rs. ${total_amount}\nPhone: ${phone_number}\nAddress: ${shipping_address}`,
          });
          console.log("EMAIL SENT SUCCESSFULLY to Admin:", info.messageId);
        } catch (err: any) {
          console.error("EMAIL ERROR (Admin):", err.message);
        }
    } else if (type === 'status_update') {
        console.log(`[Notification] Processing STATUS UPDATE for: ${order_number} -> ${status}`);
        try {
          const info = await transporter.sendMail({
            from: `"Reload Store" <${process.env.SMTP_USER}>`,
            to: customer_email,
            subject: `Order Updated - ${order_number}`,
            text: `Hi ${customer_name},\n\nYour order ${order_number} status is now: ${status}.\n\nBest,\nReload Store Team`
          });
          console.log("EMAIL SENT SUCCESSFULLY (Status Update):", info.messageId);
        } catch (err: any) {
          console.error("EMAIL ERROR (Status):", err.message);
        }
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error("CRITICAL NOTIFICATION FAILURE:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Original endpoint alias for backward compatibility
app.post("/api/notifications/order", (req, res) => {
    // Redirect to the new handler or just call it
    app._router.handle(req, res, () => {});
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
