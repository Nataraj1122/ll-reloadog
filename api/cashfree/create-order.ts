export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' });
  }

  const { order_id, order_amount, customer_details, return_url } = req.body;
  
  const clientId = process.env.CASHFREE_CLIENT_ID?.trim();
  const clientSecret = process.env.CASHFREE_CLIENT_SECRET?.trim();
  const isProd = process.env.CASHFREE_ENV?.trim() === "production";
  const url = isProd 
    ? "https://api.cashfree.com/pg/orders" 
    : "https://sandbox.cashfree.com/pg/orders";

  // Verify that the backend is reading the Vercel environment variables safely
  console.log(`[VERCEL API CASHFREE CONFIG VERIFICATION] CASHFREE_CLIENT_ID exists: ${!!clientId}`);
  console.log(`[VERCEL API CASHFREE CONFIG VERIFICATION] CASHFREE_CLIENT_SECRET exists: ${!!clientSecret}`);
  console.log(`[VERCEL API CASHFREE CONFIG VERIFICATION] CASHFREE_ENV: ${process.env.CASHFREE_ENV || "not set"}`);

  console.log(`[VERCEL API CASHFREE] Creating order session. ID: ${order_id}, Target Env: ${isProd ? "production" : "sandbox"}`);

  // 1. Validate credentials
  if (!clientId || !clientSecret) {
    console.warn("[VERCEL API CASHFREE] ERROR: CASHFREE_CLIENT_ID or CASHFREE_CLIENT_SECRET is missing!");
    return res.status(400).json({
      success: false,
      error: "CASHFREE_CREDENTIALS_MISSING",
      message: "Cashfree Payment Gateway is not configured yet. Please configure CASHFREE_CLIENT_ID and CASHFREE_CLIENT_SECRET in the settings/environment variables."
    });
  }

  // 2. Validate API endpoint
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname !== 'api.cashfree.com' && urlObj.hostname !== 'sandbox.cashfree.com') {
      throw new Error(`Invalid Cashfree Hostname: ${urlObj.hostname}`);
    }
  } catch (urlErr: any) {
    console.error("[VERCEL API CASHFREE VALIDATION] Endpoint validation failed:", urlErr.message);
    return res.status(400).json({
      success: false,
      error: "INVALID_API_ENDPOINT",
      message: `Invalid Cashfree API Endpoint configured: ${url}`
    });
  }

  // 3. Validate Order ID
  const orderIdRegex = /^[a-zA-Z0-9_-]+$/;
  if (!order_id || typeof order_id !== "string" || !orderIdRegex.test(order_id) || order_id.length < 3 || order_id.length > 45) {
    const errMsg = `Invalid Order ID format: ${order_id}. Must be 3-45 chars, alphanumeric with hyphens/underscores only.`;
    console.error("[VERCEL API CASHFREE VALIDATION]", errMsg);
    return res.status(400).json({ success: false, error: "INVALID_ORDER_ID", message: errMsg });
  }

  // 4. Validate Order Amount
  const parsedAmount = parseFloat(order_amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    const errMsg = `Invalid Order Amount: ${order_amount}. Must be a positive numeric value greater than zero.`;
    console.error("[VERCEL API CASHFREE VALIDATION]", errMsg);
    return res.status(400).json({ success: false, error: "INVALID_ORDER_AMOUNT", message: errMsg });
  }

  // 5. Validate Customer Details
  if (!customer_details) {
    console.error("[VERCEL API CASHFREE VALIDATION] Missing customer details");
    return res.status(400).json({ success: false, error: "MISSING_CUSTOMER_DETAILS", message: "Customer details are required." });
  }

  // Email Validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const custEmail = customer_details.customer_email || "";
  if (!custEmail || typeof custEmail !== "string" || !emailRegex.test(custEmail)) {
    const errMsg = `Invalid Customer Email: ${custEmail}. Must be a valid email format.`;
    console.error("[VERCEL API CASHFREE VALIDATION]", errMsg);
    return res.status(400).json({ success: false, error: "INVALID_CUSTOMER_EMAIL", message: errMsg });
  }

  // Phone Validation
  const rawPhone = customer_details.customer_phone || "";
  const cleanedPhone = String(rawPhone).replace(/\D/g, '');
  if (!cleanedPhone || cleanedPhone.length < 10 || cleanedPhone.length > 12) {
    const errMsg = `Invalid Customer Phone: ${rawPhone} (Cleaned: ${cleanedPhone}). Must be a valid 10 to 12 digit phone number.`;
    console.error("[VERCEL API CASHFREE VALIDATION]", errMsg);
    return res.status(400).json({ success: false, error: "INVALID_CUSTOMER_PHONE", message: errMsg });
  }

  // Customer ID Validation
  const custId = customer_details.customer_id || `cust_${Date.now()}`;
  if (typeof custId !== "string" || !orderIdRegex.test(custId) || custId.length < 3 || custId.length > 45) {
    const errMsg = `Invalid Customer ID: ${custId}. Must be 3-45 chars, alphanumeric with hyphens/underscores only.`;
    console.error("[VERCEL API CASHFREE VALIDATION]", errMsg);
    return res.status(400).json({ success: false, error: "INVALID_CUSTOMER_ID", message: errMsg });
  }

  // Customer Name Validation
  const custName = customer_details.customer_name || "Guest Customer";
  if (!custName || typeof custName !== "string" || custName.trim().length === 0) {
    const errMsg = "Customer Name is required and cannot be empty.";
    console.error("[VERCEL API CASHFREE VALIDATION]", errMsg);
    return res.status(400).json({ success: false, error: "INVALID_CUSTOMER_NAME", message: errMsg });
  }

  // 6. Validate Return URL
  try {
    const urlObj = new URL(return_url);
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      throw new Error(`Unsupported protocol: ${urlObj.protocol}`);
    }
  } catch (urlErr: any) {
    const errMsg = `Invalid Return URL format: ${return_url}. Must be a valid HTTP or HTTPS URL.`;
    console.error("[VERCEL API CASHFREE VALIDATION]", errMsg);
    return res.status(400).json({ success: false, error: "INVALID_RETURN_URL", message: errMsg });
  }

  try {
    const requestBody = {
      order_id: order_id,
      order_amount: parsedAmount.toFixed(2),
      order_currency: "INR",
      customer_details: {
        customer_id: custId,
        customer_phone: cleanedPhone,
        customer_email: custEmail,
        customer_name: custName
      },
      order_meta: {
        return_url: return_url
      }
    };

    console.log("[VERCEL API CASHFREE REQUEST PAYLOAD]:", JSON.stringify(requestBody, null, 2));

    const cfResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": clientId,
        "x-client-secret": clientSecret,
        "x-api-version": "2023-08-01"
      },
      body: JSON.stringify(requestBody)
    });

    const data: any = await cfResponse.json();

    if (!cfResponse.ok) {
      console.error("[VERCEL API CASHFREE ERROR RESPONSE]:", JSON.stringify(data, null, 2));
      return res.status(cfResponse.status).json({
        success: false,
        error: "CASHFREE_API_ERROR",
        message: data.message || "Failed to create order on Cashfree PG",
        details: data
      });
    }

    console.log(`[VERCEL API CASHFREE] Order session generated successfully. ID: ${data.payment_session_id}`);
    return res.status(200).json({
      success: true,
      payment_session_id: data.payment_session_id,
      cf_order_id: data.cf_order_id,
      order_status: data.order_status,
      environment: isProd ? "production" : "sandbox"
    });
  } catch (error: any) {
    console.error("[VERCEL API CASHFREE EXCEPTION]:", error.message);
    return res.status(500).json({
      success: false,
      error: "CASHFREE_SERVER_EXCEPTION",
      message: error.message
    });
  }
}
