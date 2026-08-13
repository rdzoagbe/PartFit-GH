-- Run after the schema and RPC migrations.
revoke all on public.profiles,public.staff_roles,public.vehicles,public.orders,public.order_items,public.order_events,public.products from anon,authenticated;
grant select,update on public.profiles to authenticated;
grant select on public.staff_roles to authenticated;
grant select,insert,update,delete on public.vehicles to authenticated;
grant select on public.orders,public.order_items,public.order_events to authenticated;
grant select on public.products to anon,authenticated;
grant update on public.products to authenticated;
revoke all on function public.is_partfit_staff() from public;
grant execute on function public.is_partfit_staff() to authenticated;