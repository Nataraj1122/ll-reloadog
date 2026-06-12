
import { supabase } from '../lib/supabase';

export interface OrderNotificationData {
  order_number: string;
  customer_name: string;
  customer_email: string;
  phone_number: string;
  total_amount: number;
  shipping_address?: string;
  items?: any[];
  status?: string;
}

/**
 * Service layer for handling all notifications (Email, WhatsApp, etc.)
 * as requested in the requirements.
 */
export class NotificationService {
  private static API_URL = '/api/send-order-email';

  /**
   * Primary method to trigger notifications for a new order.
   * This calls the backend API which handles the secure SMTP and WhatsApp logic.
   */
  static async notifyNewOrder(data: OrderNotificationData) {
    console.log(`[NotificationService] Triggering new order notification for ${data.order_number}`);
    
    try {
      // 1. Trigger Backend API for Email/WhatsApp
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, type: 'new_order' })
      });
      
      console.log(`[NotificationService] API Status: ${response.status} ${response.statusText}`);
      
      let result;
      const text = await response.text();
      try {
        result = JSON.parse(text);
      } catch (e) {
        console.error("[NotificationService] API returned non-JSON response:", text);
        throw new Error(`Server returned invalid response (HTTP ${response.status}): ${text.slice(0, 100)}...`);
      }

      if (!response.ok) {
        console.error("[NotificationService] API Error:", result);
        throw new Error(result.error || result.message || `Failed to send notifications (HTTP ${response.status})`);
      }

      console.log("[NotificationService] API Success:", result);
      return { success: true };
    } catch (error: any) {
      console.error('[NotificationService] Caught Exception:', error);
      return { 
        success: false, 
        message: error.message,
        error: {
          message: error.message,
          details: error.toString(),
          stack: error.stack
        } 
      };
    }
  }

  /**
   * Notify customer of an order status change.
   */
  static async notifyStatusUpdate(data: Partial<OrderNotificationData>) {
    console.log(`[NotificationService] Triggering status update for ${data.order_number} -> ${data.status}`);
    
    try {
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, type: 'status_update' })
      });
      
      if (!response.ok) throw new Error('Failed to send status update notification');
      return { success: true };
    } catch (error) {
      console.error('[NotificationService] Status Update Error:', error);
      return { success: false, error };
    }
  }

  /**
   * Placeholder for WhatsApp integration layer.
   * Currently mocks the behavior as requested.
   */
  static async sendWhatsAppMessage(phone: string, message: string) {
    // This would integrate with Twilio, Meta Graph API, etc.
    console.log(`[WhatsApp Service Layer] To: ${phone} | Msg: ${message}`);
    // Future implementation goes here
    return true;
  }
}
