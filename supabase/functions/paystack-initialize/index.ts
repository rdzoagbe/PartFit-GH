// PartFit Ghana — Paystack: initialize a Mobile Money charge for an approved,
// unpaid order. Runs server-side (Supabase Edge Function). The amount is
// derived from the order's confirmed_total inside begin_paystack_payment — it
// is never taken from the client. The secret key lives only in Deno.env.
//
// Deploy: supabase functions deploy paystack-initialize
// (JWT verification ON — the caller must be the signed-in customer.)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth) return json({ error: "Sign in required" }, 401);

    const { public_ref, email } = await req.json();
    if (!public_ref) return json({ error: "Missing order reference" }, 400);

    // Client scoped to the caller's JWT so auth.uid() resolves in the RPC (RLS).
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );

    const reference = "PF_" + public_ref + "_" + crypto.randomUUID().slice(0, 8);

    // Opens a pending payment and returns the server-owned amount (GHS).
    const { data: amount, error } = await supabase.rpc("begin_paystack_payment", {
      p_public_ref: public_ref,
      p_reference: reference,
    });
    if (error) return json({ error: error.message }, 400);

    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + Deno.env.get("PAYSTACK_SECRET_KEY"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email || "customer@partfit.gh",
        amount: Math.round(Number(amount) * 100), // GHS -> pesewas
        currency: "GHS",
        reference,
        channels: ["mobile_money", "card"],
        metadata: { public_ref },
        callback_url: (Deno.env.get("PAYMENT_CALLBACK_URL") || "") + "#track:" + public_ref,
      }),
    });
    const pj = await res.json();
    if (!pj.status) return json({ error: pj.message || "Could not start payment" }, 400);

    return json({ authorization_url: pj.data.authorization_url, reference });
  } catch (e) {
    return json({ error: (e as Error).message || "Unexpected error" }, 400);
  }
});
