# PartFit Ghana — Security Model

The current GitHub Pages build is a customer-experience prototype. Local browser storage is acceptable for demonstrations, but it must not be treated as the source of truth for production accounts, orders, staff roles, stock, approved prices or order status.

## Production rules

1. Authentication is handled by a managed identity provider such as Supabase Auth or Firebase Auth.
2. The backend owns order IDs, stock, confirmed prices, approval status and collection status.
3. Customers may read only their own profile, vehicles and orders.
4. Staff actions require authenticated staff roles; manager-only actions are enforced server-side.
5. A customer can submit an order request, but cannot set `confirmed_price`, `approved_at`, `ready_at`, `collected_at` or staff notes.
6. Public order references are separate from internal UUID primary keys.
7. Every order-state change creates an immutable audit event containing actor, timestamp, previous state and new state.
8. Customer-visible tracking requires an authenticated owner session or a short-lived signed tracking token.
9. VIN/chassis data is treated as sensitive customer data and is not stored in localStorage.
10. Exact supplier/OE fitment evidence is retained for vehicle-specific parts.

## Pay-on-pickup state machine

`submitted -> reviewing -> approved -> ready_for_collection -> collected`

Optional terminal states: `rejected`, `cancelled`, `expired`.

The customer pays nothing at `submitted` or `reviewing`. The backend creates the confirmed price only when an authorized staff member approves the order. Payment is collected at the Spintex collection point when the order is handed over.

## Before real launch

- Move customer profiles, orders and vehicles out of localStorage.
- Remove the prototype email-only sign-in.
- Use database row-level authorization policies.
- Add rate limits for authentication, contact and part-request endpoints.
- Configure production security headers at the hosting/CDN layer.
- Add backups, audit logging, error monitoring and dependency scanning.
- Keep secrets and privileged API keys out of the browser and repository.
