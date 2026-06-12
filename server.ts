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

// Set up Nodemailer transporter using Mailtrap or any SMTP you provide
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.mailtrap.io",
  port: parseInt(process.env.SMTP_PORT || "2525"),
  auth: {
    user: process.env.SMTP_USER || "test_user",
    pass: process.env.SMTP_PASS || "test_pass",
  },
});

// Notifications API
app.post("/api/notifications/order", async (req, res) => {
  try {
    const { order_number, customer_name, customer_email, phone_number, total_amount, shipping_address, items, type, status } = req.body;

    if (type === 'new_order') {
        const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";

        // 1. WhatsApp API skeleton
        // WhatsAppService.sendOrderMessage(phone_number, adminEmail, order_number);
        console.log(`[WhatsApp Service] Mocking message send to: ${phone_number} for Order: ${order_number}`);

        // 2. Email to Customer
        try {
          await transporter.sendMail({
            from: '"Store Demo" <no-reply@store.local>',
            to: customer_email,
            subject: `Order Confirmation - ${order_number}`,
            text: `Hi ${customer_name},\n\nThank you for your order!\nOrder Details:\nOrder Number: ${order_number}\nTotal: ${total_amount}\n\nWe will notify you when your order ships.\n\nBest,\nStore Team`,
            html: `<h3>Thank you for your order, ${customer_name}!</h3>
                   <p><strong>Order Number:</strong> ${order_number}</p>
                   <p><strong>Total:</strong> Rs. ${total_amount}</p>
                   <p><strong>Shipping to:</strong> ${shipping_address}</p>
                   <p>We'll notify you when it ships.</p>`
          });
          console.log(`[Email] Customer order confirmation sent to ${customer_email}`);
        } catch (err: any) {
          console.error("[Email] Customer email error: ", err.message);
        }

        // 3. Email to Admin
        try {
          await transporter.sendMail({
            from: '"Store System" <system@store.local>',
            to: adminEmail,
            subject: `New Order Received - ${order_number}`,
            text: `New order: ${order_number}\nCustomer: ${customer_name}\nTotal: Rs. ${total_amount}\nPhone: ${phone_number}\nAddress: ${shipping_address}`,
          });
          console.log(`[Email] Admin order notification sent to ${adminEmail}`);
        } catch (err: any) {
          console.error("[Email] Admin email error: ", err.message);
        }
    } else if (type === 'status_update') {
        // Send email/whatsapp on status update to customer
        try {
          await transporter.sendMail({
            from: '"Store Demo" <no-reply@store.local>',
            to: customer_email,
            subject: `Order Update - ${order_number}`,
            text: `Hi ${customer_name},\n\nYour order ${order_number} status has been updated to: ${status}.\n\nBest,\nStore Team`
          });
          console.log(`[Email] Status update sent to ${customer_email}`);
        } catch (err: any) {
          console.error("[Email] Status update email error: ", err.message);
        }
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error("Failed to process notification:", err);
    res.status(500).json({ error: "Notification processing failed" });
  }
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
