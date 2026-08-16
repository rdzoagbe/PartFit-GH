# PartFit Ghana — Mobile Money payments (Paystack) setup

This wires **pay-after-approval** Mobile Money: a customer pays only after you
confirm fitment/stock and set the final price; Paystack collects the MoMo
payment; a signature-verified webhook marks the order **paid**; you then release
it for delivery or pickup.

> **Phase 1 (this folder) is dormant** until you complete the steps below **and**
> Phase 2 wires the customer "Pay with MoMo" button and the staff payment badge.
> Nothing charges real money until you deploy with live keys.

## Security model (why it's safe)

- The **secret key never touches the browser or this repo** — it lives only in
  Supabase function secrets.
- The **amount is derived server-side** from the order's `confirmed_total`
  (`begin_paystack_payment`), so a tampered client can't change what's charged.
- An order is marked **paid only by the webhook**, and only after Paystack's
  **HMAC-SHA512 signature** is verified and the amount paid is **≥ amount due**.
  `settle_paystack_payment` is idempotent, so replays are harmless.

## One-time setup

1. **Create a Paystack account** for the business (Ghana / **GHS**), and enable
   **Mobile Money** (MTN, Telecel/Vodafone, AirtelTigo). Start in **Test mode**.
2. Copy your **Test secret key** (`sk_test_…`) from Paystack → Settings → API Keys.
3. **Run the schema:** open Supabase → SQL editor and run
   [`backend/momo-paystack.sql`](backend/momo-paystack.sql). Safe to re-run.
4. **Set the function secrets** (Supabase CLI). `SUPABASE_URL` and
   `SUPABASE_SERVICE_ROLE_KEY` are injected automatically for functions; you set:

   ```bash
   supabase secrets set \
     PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxx \
     PAYMENT_CALLBACK_URL=https://your-app-url/     # where the app is hosted
   ```

5. **Deploy the functions:**

   ```bash
   supabase functions deploy paystack-initialize          # customer-authenticated
   supabase functions deploy paystack-webhook --no-verify-jwt   # Paystack has no Supabase JWT
   ```

6. **Register the webhook:** Paystack → Settings → API Keys & Webhooks → set the
   **Webhook URL** to your deployed webhook function, e.g.
   `https://zvhypcwaqnquwbmfrwuy.functions.supabase.co/paystack-webhook`
   (or `https://zvhypcwaqnquwbmfrwuy.supabase.co/functions/v1/paystack-webhook`).

7. **Test** end-to-end in Paystack **Test mode** using their test Mobile Money
   flow. Confirm the order flips to `paid` and appears as paid in the staff view
   (Phase 2).

8. **Go live:** switch the Paystack dashboard to Live, repeat step 4 with the
   **live** secret key (`sk_live_…`), redeploy, and update the webhook URL if
   needed.

## Notes

- **CSP:** no change needed. The function calls go to the Supabase host, which
  is already in `connect-src`, and the Paystack checkout is a **top-level
  redirect** (not a `fetch`), so it isn't restricted by `connect-src`.
- **Files in this phase:**
  - `backend/momo-paystack.sql` — `payments` table, order payment columns, and
    the `begin_paystack_payment` / `settle_paystack_payment` functions.
  - `supabase/functions/paystack-initialize/` — starts a MoMo charge, returns
    the hosted-checkout URL.
  - `supabase/functions/paystack-webhook/` — verifies the signature and settles
    the payment.
- **Next (Phase 2):** a customer "Pay with MoMo" step on approved orders that
  redirects to Paystack checkout and returns to `#track:<ref>` to poll for
  `paid`, plus a **payment badge + "money received" gate** in the staff console
  so fulfilment is only released after the cash confirms.
