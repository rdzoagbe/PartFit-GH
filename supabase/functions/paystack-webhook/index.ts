// PartFit Ghana — Paystack webhook. Paystack calls this after a charge. We
// verify the HMAC-SHA512 signature with the secret key, and only then settle
// the payment (service role). settle_paystack_payment is idempotent and guards
// underpayment, so replays and out-of-order deliveries are safe.
//
// Deploy: supabase functions deploy paystack-webhook --no-verify-jwt
// (Paystack does not send a Supabase JWT — auth is the signature check below.)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const body = await req.text();
  const secret = Deno.env.get("PAYSTACK_SECRET_KEY")!;
  const expected = createHmac("sha512", secret).update(body).digest("hex");
  const signature = req.headers.get("x-paystack-signature") || "";
  if (expected !== signature) return new Response("Invalid signature", { status: 401 });

  let evt: any;
  try { evt = JSON.parse(body); } catch { return new Response("Bad payload", { status: 400 }); }

  if (evt?.event === "charge.success" && evt?.data?.reference) {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const d = evt.data;
    const { error } = await supabase.rpc("settle_paystack_payment", {
      p_reference: d.reference,
      p_status: "success",
      p_amount: Number(d.amount) / 100, // pesewas -> GHS
      p_channel: d.channel ?? null,
      p_raw: d,
    });
    // Log but still 200 so Paystack doesn't hammer retries on a transient DB blip.
    if (error) console.error("settle_paystack_payment failed:", error.message);
  }

  return new Response("ok", { status: 200 });
});
