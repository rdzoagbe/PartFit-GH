# PartFit Ghana — Production Backend Procedure

The GitHub Pages build is intentionally safe for demonstration: customer orders, My Garage and approval simulation remain local to the browser. Real customer data must move to Supabase before commercial launch.

## 1. Create the Supabase project

Create a Supabase project, choose the nearest suitable region, enable email authentication, and keep email confirmation enabled for production. In Auth URL Configuration set the Site URL to the final PartFit HTTPS domain and add only the exact GitHub Pages URL while testing.

## 2. Run the SQL

**Simplest:** paste **`backend/setup-all.sql`** into the Supabase SQL editor and Run it once. It is idempotent (safe to re-run) and combines everything below in the correct order, so ordering mistakes or partial re-runs cannot break the schema.

Or run the individual files in this exact order:

1. `backend/supabase-schema.sql`
2. `backend/v5-products.sql`
3. `backend/v5-rpc.sql`
4. `backend/v5-indexes.sql`
5. `backend/v5-grants.sql`

Review every statement in the Supabase SQL editor before executing it.

## 3. Create the first staff user

Create the staff account through Supabase Auth, copy that user's UUID, then insert it manually in the SQL editor:

```sql
insert into public.staff_roles(user_id,role)
values ('USER_UUID_HERE','admin');
```

Never expose a service-role key in the browser.

## 4. Browser configuration

Only the public project URL and anonymous/publishable client key may be placed in browser configuration. The repository already includes `v5-config.js` and a Supabase adapter blueprint. Service-role keys, WhatsApp Business API secrets and privileged admin tokens belong only in protected server/runtime configuration.

## 5. Order security model

The browser submits only product IDs and quantities. `submit_order()` looks up current price and stock on the server, creates the public order reference and stores the provisional total in one database transaction. The customer cannot write an approved price.

Staff uses `staff_set_order_status()` to move an order through:

`submitted -> reviewing -> approved -> ready_for_collection -> collected`

At approval, the server stores the confirmed amount and a reservation expiry. Every status change creates an audit event.

## 6. Pay-on-pickup rules

- No payment at submission.
- No payment while fitment/stock are under review.
- Staff approves the exact fitment and final price.
- The approved amount is shown to the customer.
- Customer pays when collecting at Spintex.
- Recommended reservation window: 48 hours after approval.
- Uncollected reservations can be marked expired and returned to available stock.

## 7. Production checks before real customers

- Test customer A cannot read customer B's orders.
- Test customers cannot update status or confirmed totals.
- Test an unauthenticated browser cannot read profiles/orders.
- Test only staff accounts can read the staff queue.
- Test invalid order-state transitions are rejected.
- Test inactive/out-of-stock products cannot be submitted.
- Test all authentication redirect URLs are HTTPS and allow-listed.
- Configure backups, error monitoring, rate limiting and auth attack protection.
- Put the final site behind hosting/CDN controls that can set response security headers.

## 8. Current test procedure

On GitHub Pages, use **My PartFit -> Continue as Demo Customer**. Submit an order, open its tracking page, then use the visible **End-to-end test controls** to simulate Review, Approval, Ready and Collected. Those controls exist only for local testing and do not represent the production staff security boundary.