create index if not exists idx_partfit_vehicles_owner on public.vehicles(owner_id);
create index if not exists idx_partfit_orders_customer on public.orders(customer_id,created_at desc);
create index if not exists idx_partfit_orders_status on public.orders(status,updated_at desc);
create index if not exists idx_partfit_items_order on public.order_items(order_id);
create index if not exists idx_partfit_events_order on public.order_events(order_id,created_at);