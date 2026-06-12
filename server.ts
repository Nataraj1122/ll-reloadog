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
});

// Verify connection configuration
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter.verify((error, success) => {
    if (error) {
      console.error("[SMTP] Connection error:", error.message);
      console.log("[SMTP] Tip: Ensure you are using a Google App Password, not your regular password.");
    } else {
      console.log("[SMTP] Server is ready to take our messages");
    }
  });
} else {
  console.warn("[SMTP] Warning: SMTP_USER or SMTP_PASS is missing in environment variables.");
}

// Notifications API
app.post("/api/send-order-email", async (req, res) => {
  try {
    const { order_number, customer_name, customer_email, phone_number, total_amount, shipping_address, items, type, status } = req.body;
    const adminEmail = "reloadwebsite172@gmail.com"; // Requested specific admin email

    if (type === 'new_order') {
        console.log(`[Notification] Processing new order: ${order_number}`);

        // 1. WhatsApp Mock
        console.log(`[WhatsApp Service] Mocking message to: ${phone_number} | Admin: ${process.env.ADMIN_PHONE || '985936088'}`);

        // 2. Email to Customer
        try {
          await transporter.sendMail({
            from: `"Reload Store" <${process.env.SMTP_USER}>`,
            to: customer_email,
            subject: `Order Confirmation - ${order_number}`,
            html: `<h3>Thank you for your order, ${customer_name}!</h3>
                   <p><strong>Order Number:</strong> ${order_number}</p>
                   <p><strong>Total:</strong> Rs. ${total_amount}</p>
                   <p><strong>Shipping to:</strong> ${shipping_address}</p>
                   <p>We'll notify you when it ships.</p>`
          });
          console.log("EMAIL SENT SUCCESSFULLY to Customer");
        } catch (err: any) {
          console.error("EMAIL ERROR (Customer):", err.message);
        }

        // 3. Email to Admin
        try {
          await transporter.sendMail({
            from: `"Store System" <${process.env.SMTP_USER}>`,
            to: adminEmail,
            subject: `New Order Alert - ${order_number}`,
            text: `New Alert!\nOrder Number: ${order_number}\nCustomer: ${customer_name}\nTotal: Rs. ${total_amount}\nPhone: ${phone_number}\nAddress: ${shipping_address}`,
          });
          console.log("EMAIL SENT SUCCESSFULLY to Admin");
        } catch (err: any) {
          console.error("EMAIL ERROR (Admin):", err.message);
        }
    } else if (type === 'status_update') {
        try {
          await transporter.sendMail({
            from: `"Reload Store" <${process.env.SMTP_USER}>`,
            to: customer_email,
            subject: `Order Updated - ${order_number}`,
            text: `Hi ${customer_name},\n\nYour order ${order_number} status is now: ${status}.\n\nBest,\nReload Store Team`
          });
          console.log("EMAIL SENT SUCCESSFULLY (Status Update)");
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
