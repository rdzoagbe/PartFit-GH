# PartFit Ghana

Mobile-first installable auto-parts storefront for Ghana with vehicle fitment guidance, account/order experience, WhatsApp support and pay-on-pickup collection at Spintex.

## Live site

GitHub Pages publishes from `main` at `https://rdzoagbe.github.io/PartFit-GH/`.

## Safe end-to-end test

1. Open **My PartFit** / **Account**.
2. Choose **Continue as Demo Customer**. No real credentials are requested on GitHub Pages.
3. Select a vehicle and optionally save it to **My Garage**.
4. Browse parts, open product details and add items to the order.
5. Submit the order. The catalogue/basket amount is provisional and no payment is due.
6. Open **My Orders -> Track Order**.
7. In the Demo Customer session, use the **End-to-end test controls** to simulate Under Review, Approved, Ready for Collection and Collected. You can enter a different confirmed amount before approval.
8. Check that the tracking page changes from provisional price to **approved amount due at pickup**.
9. Install the PWA from the browser's **Add to Home Screen / Install** option and repeat the mobile flow.

## Real business flow

`select vehicle -> browse/request part -> submit -> fitment & stock review -> approved final price -> ready for collection -> pay at Spintex -> collected`

The customer does not pay online. Approval is the commercial confirmation that PartFit has checked fitment, stock and the final amount.

## Fitment safety

PartFit distinguishes manufacturer-supported application data from potential matches that still require OE/VIN/engine confirmation. Brake pads, filters, belts and plugs must never be approved from appearance or make/model alone. See `FITMENT_DATA.md`.

## Images

The current catalogue clearly labels category/reference images. Replace each one with the exact supplier/manufacturer SKU photo before commercial launch.

## Production backend

The repository contains a Supabase/Postgres production blueprint in `backend/`:

- `supabase-schema.sql` — customers, staff roles, vehicles, orders, items and audit events
- `v5-products.sql` — server-owned catalogue prices and stock
- `v5-rpc.sql` — transactional order submission and controlled staff status changes
- `v5-indexes.sql` — lookup/RLS performance indexes
- `v5-grants.sql` — Data API grants

Follow `BACKEND_SETUP.md` before using real customer data. The service-role key or any privileged messaging credential must never be committed to this repository.

## PWA

The manifest and service worker support standalone installation. Navigation and application scripts use a network-first update strategy so previously installed phones are less likely to remain on stale builds.