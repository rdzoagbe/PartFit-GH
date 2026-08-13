# PartFit Ghana — Backend Migration Plan

## Recommended first production backend

Use Supabase Auth + Postgres + Row Level Security. Keep the current static/PWA storefront, but replace browser-local account/order state with authenticated database calls.

## Migration order

1. Create a Supabase project in the Ghana/West-Africa-appropriate nearest available region.
2. Run `backend/supabase-schema.sql` and review policies before adding users.
3. Configure customer authentication (email/password or OTP) and verified phone/email recovery.
4. Replace `pfProfileV3`, `pfOrdersV3` and staff/local status writes with database reads/writes.
5. Keep only harmless UX preferences such as selected vehicle/category in localStorage.
6. Create a separate staff application or protected `/admin` build. Do not load staff controls in the public customer bundle.
7. Staff approval writes the confirmed price and order status server-side, then creates an `order_events` audit record.
8. Send customer WhatsApp/email notifications from an approved server-side integration; do not put privileged messaging credentials in browser JavaScript.
9. Add rate limiting, monitoring, backups and an error-reporting service.
10. Put the final site behind a custom domain/CDN where production HTTP security headers can be configured.

## Customer flow

`catalogue -> submit order -> reviewing -> approved + confirmed price -> ready for collection -> pay at pickup -> collected`

The catalogue price is provisional until approval. A customer never writes the confirmed total or staff-controlled status.

## Admin flow

`new requests -> fitment/stock review -> adjust approved lines/price -> approve -> notify -> prepare -> ready -> collect/payment recorded`

Every status or price change must be attributable to an authenticated staff account.

## Environment variables

Public browser configuration may contain only the project's public URL/anonymous client key. Any service-role key, privileged messaging token or admin secret must live only in a protected server/runtime environment and must never be committed to this repository.
