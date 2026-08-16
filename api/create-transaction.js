// POST /api/create-transaction
// Creates a Midtrans Snap transaction for one month of AllRemover Pro and
// returns the Snap token. The Server Key is read from an env var and never
// leaves the server. The order id embeds the buyer's Firebase uid so the
// webhook can grant Pro to the right account.
//
// Env vars (set in Vercel):
//   MIDTRANS_SERVER_KEY   e.g. Mid-server-xxx (sandbox) / prod key later
//   MIDTRANS_IS_PRODUCTION  "true" for production, anything else = sandbox

const PRICE_IDR = 20000; // AllRemover Pro, per month

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) {
    res.status(500).json({ error: "Server not configured" });
    return;
  }

  // Body: { uid, email }. Both come from the signed-in Firebase user.
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  const uid = body && body.uid;
  const email = body && body.email;
  if (!uid) {
    res.status(400).json({ error: "Missing uid" });
    return;
  }

  const isProd = process.env.MIDTRANS_IS_PRODUCTION === "true";
  const base = isProd
    ? "https://app.midtrans.com/snap/v1/transactions"
    : "https://app.sandbox.midtrans.com/snap/v1/transactions";

  // order_id must be unique per attempt; prefix with uid so the webhook can
  // recover which account to upgrade. Keep it URL/space safe and < 50 chars.
  const shortUid = String(uid).slice(0, 24);
  const orderId = `pro-${shortUid}-${Date.now()}`;

  const payload = {
    transaction_details: { order_id: orderId, gross_amount: PRICE_IDR },
    item_details: [{
      id: "allremover-pro-1m",
      price: PRICE_IDR,
      quantity: 1,
      name: "AllRemover Pro (1 month)",
    }],
    customer_details: email ? { email } : undefined,
    // custom fields carry the uid through to the notification webhook
    custom_field1: uid,
    credit_card: { secure: true },
  };

  const auth = Buffer.from(serverKey + ":").toString("base64");

  try {
    const r = await fetch(base, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Basic ${auth}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await r.json();
    if (!r.ok || !data.token) {
      res.status(502).json({ error: "Midtrans error", detail: data });
      return;
    }
    res.status(200).json({ token: data.token, orderId });
  } catch (e) {
    res.status(502).json({ error: "Request failed", detail: String(e) });
  }
}
