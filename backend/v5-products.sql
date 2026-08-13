-- PartFit Ghana V5: server-owned product catalogue
create table if not exists public.products (
  id text primary key,
  brand text not null,
  name text not null,
  part_number text not null,
  category text not null,
  current_price numeric(12,2) not null check (current_price >= 0),
  stock_qty integer not null default 0 check (stock_qty >= 0),
  active boolean not null default true,
  fitment_level text not null default 'confirm' check (fitment_level in ('catalog','confirm','none')),
  updated_at timestamptz not null default now()
);
alter table public.products enable row level security;
drop policy if exists "products public read" on public.products;
create policy "products public read" on public.products for select using (active=true);
drop policy if exists "products staff update" on public.products;
create policy "products staff update" on public.products for update using (public.is_partfit_staff()) with check (public.is_partfit_staff());

insert into public.products(id,brand,name,part_number,category,current_price,stock_qty,fitment_level) values
('denso-k16tt','DENSO','DENSO K16TT Spark Plug','K16TT','Spark Plugs',35,24,'catalog'),
('air-1kr','Aftermarket','Engine Air Filter — Toyota 1KR-FE type','PF-AF-1KR','Air Filters',85,10,'confirm'),
('bosch-cabin-5002','Bosch','Bosch Cabin Filter 1987435002','1987435002','Cabin Filters',95,8,'catalog'),
('bosch-cabin-2113','Bosch','Bosch Cabin Filter M 2113','1987432113','Cabin Filters',90,7,'catalog'),
('oil-spin','Aftermarket','Spin-On Engine Oil Filter — Sample Line','PF-OF-01','Oil Filters',50,18,'confirm'),
('brake-front','Aftermarket','Front Brake Pad Set — Sample Application','PF-BP-101','Brake Pads',120,6,'confirm'),
('brake-rear','Aftermarket','Rear Brake Pad Set — Sample Application','PF-BP-201','Brake Pads',110,5,'confirm'),
('conti-6pk1029','Continental','Continental 6PK1029 ELAST Multi-V Belt','6PK1029 ELAST','Belts',140,9,'catalog'),
('conti-6pk1059','Continental','Continental 6PK1059 ELAST Multi-V Belt','6PK1059 ELAST','Belts',150,6,'catalog')
on conflict(id) do update set brand=excluded.brand,name=excluded.name,part_number=excluded.part_number,category=excluded.category,current_price=excluded.current_price,stock_qty=excluded.stock_qty,fitment_level=excluded.fitment_level,updated_at=now();