export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' });
  }

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

  // Verify that the backend is reading the Vercel environment variables safely
  console.log(`[VERCEL API CASHFREE STATUS CONFIG VERIFICATION] CASHFREE_CLIENT_ID exists: ${!!clientId}`);
  console.log(`[VERCEL API CASHFREE STATUS CONFIG VERIFICATION] CASHFREE_CLIENT_SECRET exists: ${!!clientSecret}`);
  console.log(`[VERCEL API CASHFREE STATUS CONFIG VERIFICATION] CASHFREE_ENV: ${process.env.CASHFREE_ENV || "not set"}`);

  if (!clientId || !clientSecret) {
    console.warn("[VERCEL API CASHFREE STATUS] ERROR: CASHFREE_CLIENT_ID or CASHFREE_CLIENT_SECRET is missing!");
    return res.status(400).json({
      success: false,
      error: "CASHFREE_CREDENTIALS_MISSING",
      message: "Cashfree credentials are not configured on the server."
    });
  }

  try {
    console.log(`[VERCEL API CASHFREE STATUS] Checking status for order ID: ${order_id}, Target Env: ${isProd ? "production" : "sandbox"}`);

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
      console.error("[VERCEL API CASHFREE STATUS ERROR RESPONSE]:", data);
      return res.status(cfResponse.status).json({
        success: false,
        error: "CASHFREE_API_ERROR",
        message: data.message || "Failed to check order status from Cashfree PG"
      });
    }

    console.log(`[VERCEL API CASHFREE STATUS] Verified status for order ${order_id}:`, data.order_status);
    return res.status(200).json({
      success: true,
      order_status: data.order_status,
      order_amount: data.order_amount,
      payment_session_id: data.payment_session_id
    });
  } catch (error: any) {
    console.error("[VERCEL API CASHFREE STATUS EXCEPTION]:", error.message);
    return res.status(500).json({
      success: false,
      error: "CASHFREE_SERVER_EXCEPTION",
      message: error.message
    });
  }
}
