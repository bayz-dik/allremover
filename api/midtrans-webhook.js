// POST /api/midtrans-webhook
// Midtrans calls this after a payment changes state. We verify the signature,
// and on a settled/captured payment we grant one month of Pro to the buyer's
// Firebase account (uid carried in custom_field1 / parsed from order_id).
//
// Env vars (set in Vercel):
//   MIDTRANS_SERVER_KEY        used to verify the notification signature
//   FIREBASE_SERVICE_ACCOUNT   full service-account JSON (as a string)
//
// Security: we recompute Midtrans' SHA512 signature from the raw fields, so a
// forged POST can't grant Pro. Firestore is written with the Admin SDK, which
// bypasses the client rules (client writes are disabled).

import crypto from "node:crypto";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function getDb() {
  if (!getApps().length) {
    const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    initializeApp({ credential: cert(svc) });
  }
  return getFirestore();
}

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }

  const {
    order_id, status_code, gross_amount, signature_key,
    transaction_status, fraud_status, custom_field1,
  } = body || {};

  if (!order_id || !status_code || !gross_amount || !signature_key) {
    res.status(400).json({ error: "Incomplete notification" }); return;
  }

  // verify signature: sha512(order_id + status_code + gross_amount + ServerKey)
  const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
  const expected = crypto.createHash("sha512")
    .update(order_id + status_code + gross_amount + serverKey)
    .digest("hex");
  if (expected !== signature_key) {
    res.status(403).json({ error: "Bad signature" }); return;
  }

  // only grant on a genuinely paid, non-fraud transaction
  const paid = (transaction_status === "settlement" || transaction_status === "capture")
    && (fraud_status === undefined || fraud_status === "accept");
  if (!paid) {
    // acknowledge other states (pending/deny/expire/cancel) without granting
    res.status(200).json({ ok: true, ignored: transaction_status }); return;
  }

  // recover the Firebase uid: prefer custom_field1, else parse "pro-<uid>-<ts>"
  let uid = custom_field1;
  if (!uid && typeof order_id === "string" && order_id.startsWith("pro-")) {
    uid = order_id.slice(4, order_id.lastIndexOf("-"));
  }
  if (!uid) { res.status(400).json({ error: "No uid in notification" }); return; }

  try {
    const db = getDb();
    const ref = db.collection("users").doc(uid);
    // extend from the later of now or an existing (future) expiry, so paying
    // again while still active stacks the month instead of resetting it.
    const snap = await ref.get();
    const existing = snap.exists ? snap.data().proUntil : null;
    const base = (typeof existing === "number" && existing > Date.now()) ? existing : Date.now();
    const proUntil = base + MONTH_MS;
    await ref.set({
      proUntil,
      lastOrderId: order_id,
      updatedAt: Date.now(),
    }, { merge: true });
    res.status(200).json({ ok: true, proUntil });
  } catch (e) {
    res.status(500).json({ error: "Firestore write failed", detail: String(e) });
  }
}
