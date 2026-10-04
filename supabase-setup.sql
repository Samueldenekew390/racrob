-- ==============================================================
-- RACROB WATER PUMP SUPPLIER - SUPABASE DATABASE & STORAGE SCHEMA
-- Production-Ready PostgreSQL DDL, RLS Policies, Indexes & Seeds
-- ==============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- --------------------------------------------------------------
-- 1. PROFILES TABLE (Linked to auth.users)
-- --------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'customer' check (role in ('admin', 'customer')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Helper function to check if current user is an admin
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- Trigger to automatically update updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create or replace trigger on_profiles_updated
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

-- --------------------------------------------------------------
-- 2. SITE SETTINGS TABLE
-- --------------------------------------------------------------
create table if not exists public.site_settings (
  id uuid primary key default uuid_generate_v4(),
  setting_key text unique not null,
  setting_value text not null default '',
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create or replace trigger on_site_settings_updated
  before update on public.site_settings
  for each row execute procedure public.handle_updated_at();

-- --------------------------------------------------------------
-- 3. HERO SLIDESHOW TABLE
-- --------------------------------------------------------------
create table if not exists public.slides (
  id uuid primary key default uuid_generate_v4(),
  title_en text not null,
  title_am text,
  title_om text,
  title_ti text,
  title_sid text,
  title_ar text,
  description_en text,
  description_am text,
  description_om text,
  description_ti text,
  description_sid text,
  description_ar text,
  image_url text not null,
  sort_order integer default 0,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create or replace trigger on_slides_updated
  before update on public.slides
  for each row execute procedure public.handle_updated_at();

-- --------------------------------------------------------------
-- 4. PRODUCTS TABLE
-- --------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default uuid_generate_v4(),
  name_en text not null,
  name_am text,
  name_om text,
  name_ti text,
  name_sid text,
  name_ar text,
  description_en text,
  description_am text,
  description_om text,
  description_ti text,
  description_sid text,
  description_ar text,
  image_url text not null,
  price numeric(12, 2),
  bank_account text,
  category text default 'Industrial',
  model text,
  brand text default 'RACROB',
  specifications jsonb default '{}'::jsonb,
  stock_status text default 'in_stock' check (stock_status in ('in_stock', 'low_stock', 'out_of_stock', 'on_order')),
  featured boolean default false,
  sort_order integer default 0,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create or replace trigger on_products_updated
  before update on public.products
  for each row execute procedure public.handle_updated_at();

-- --------------------------------------------------------------
-- 5. APPLICATIONS TABLE (Pumping Applications & Videos)
-- --------------------------------------------------------------
create table if not exists public.applications (
  id uuid primary key default uuid_generate_v4(),
  name_en text not null,
  name_am text,
  name_om text,
  name_ti text,
  name_sid text,
  name_ar text,
  description_en text,
  description_am text,
  description_om text,
  description_ti text,
  description_sid text,
  description_ar text,
  video_url text,
  thumbnail_url text,
  sort_order integer default 0,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create or replace trigger on_applications_updated
  before update on public.applications
  for each row execute procedure public.handle_updated_at();

-- --------------------------------------------------------------
-- 6. ORDERS / PAYMENTS TABLE
-- --------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  customer_name text not null,
  phone text not null,
  receipt_url text not null,
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create or replace trigger on_orders_updated
  before update on public.orders
  for each row execute procedure public.handle_updated_at();

-- --------------------------------------------------------------
-- 7. BOOKINGS TABLE
-- --------------------------------------------------------------
create table if not exists public.bookings (
  id uuid primary key default uuid_generate_v4(),
  reference_code text unique not null,
  customer_name text not null,
  phone text not null,
  email text,
  preferred_date date not null,
  preferred_time text not null,
  service_type text not null,
  message text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create or replace trigger on_bookings_updated
  before update on public.bookings
  for each row execute procedure public.handle_updated_at();

-- --------------------------------------------------------------
-- INDEXES FOR PERFORMANCE
-- --------------------------------------------------------------
create index if not exists idx_products_is_active on public.products(is_active);
create index if not exists idx_products_featured on public.products(featured);
create index if not exists idx_products_category on public.products(category);
create index if not exists idx_slides_is_active_order on public.slides(is_active, sort_order);
create index if not exists idx_applications_active_order on public.applications(is_active, sort_order);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_bookings_status on public.bookings(status);

-- --------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- --------------------------------------------------------------

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.site_settings enable row level security;
alter table public.slides enable row level security;
alter table public.products enable row level security;
alter table public.applications enable row level security;
alter table public.orders enable row level security;
alter table public.bookings enable row level security;

-- PROFILES POLICIES
-- Users can view their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Admins can view and manage all profiles
create policy "Admins can view and manage all profiles"
  on public.profiles for all
  using (public.is_admin());

-- SITE SETTINGS POLICIES
-- Public read for all site settings
create policy "Public can read site settings"
  on public.site_settings for select
  using (true);

-- Only admins can insert, update, delete settings
create policy "Admins can manage site settings"
  on public.site_settings for all
  using (public.is_admin());

-- SLIDES POLICIES
-- Public can read active slides
create policy "Public can read active slides"
  on public.slides for select
  using (is_active = true or public.is_admin());

-- Only admins can manage slides
create policy "Admins can manage slides"
  on public.slides for all
  using (public.is_admin());

-- PRODUCTS POLICIES
-- Public can read active products
create policy "Public can read active products"
  on public.products for select
  using (is_active = true or public.is_admin());

-- Only admins can manage products
create policy "Admins can manage products"
  on public.products for all
  using (public.is_admin());

-- APPLICATIONS POLICIES
-- Public can read active applications
create policy "Public can read active applications"
  on public.applications for select
  using (is_active = true or public.is_admin());

-- Only admins can manage applications
create policy "Admins can manage applications"
  on public.applications for all
  using (public.is_admin());

-- ORDERS / PAYMENTS POLICIES
-- Anyone can create a payment order with status 'pending'
create policy "Public can insert orders"
  on public.orders for insert
  with check (status = 'pending');

-- Only admins can view, update, delete orders
create policy "Admins can view and manage orders"
  on public.orders for all
  using (public.is_admin());

-- BOOKINGS POLICIES
-- Anyone can create a booking consultation with status 'pending'
create policy "Public can insert bookings"
  on public.bookings for insert
  with check (status = 'pending');

-- Only admins can view, update, delete bookings
create policy "Admins can view and manage bookings"
  on public.bookings for all
  using (public.is_admin());

-- --------------------------------------------------------------
-- STORAGE BUCKETS SETUP & POLICIES
-- Run in Supabase SQL editor or create via Supabase Dashboard
-- --------------------------------------------------------------
insert into storage.buckets (id, name, public)
values
  ('product-images', 'product-images', true),
  ('slide-images', 'slide-images', true),
  ('application-videos', 'application-videos', true),
  ('application-thumbnails', 'application-thumbnails', true),
  ('payment-receipts', 'payment-receipts', false)
on conflict (id) do nothing;

-- Storage RLS: Public Read for public asset buckets
create policy "Public can read product-images"
  on storage.objects for select
  using (bucket_id in ('product-images', 'slide-images', 'application-videos', 'application-thumbnails'));

-- Storage RLS: Admins can upload to public asset buckets
create policy "Admins can upload public assets"
  on storage.objects for insert
  with check (bucket_id in ('product-images', 'slide-images', 'application-videos', 'application-thumbnails') and public.is_admin());

create policy "Admins can update and delete public assets"
  on storage.objects for all
  using (bucket_id in ('product-images', 'slide-images', 'application-videos', 'application-thumbnails') and public.is_admin());

-- Storage RLS: Anyone can upload a payment receipt to 'payment-receipts'
create policy "Anyone can upload payment receipts"
  on storage.objects for insert
  with check (bucket_id = 'payment-receipts');

-- Storage RLS: Only admins can view payment receipts (preserves customer privacy!)
create policy "Only admins can view payment receipts"
  on storage.objects for select
  using (bucket_id = 'payment-receipts' and public.is_admin());

create policy "Only admins can delete payment receipts"
  on storage.objects for delete
  using (bucket_id = 'payment-receipts' and public.is_admin());

-- --------------------------------------------------------------
-- SEED DEFAULT SETTINGS
-- --------------------------------------------------------------
insert into public.site_settings (setting_key, setting_value, description)
values
  ('business_name', 'RACROB', 'Official business trade name'),
  ('business_category', 'Water Pump Supplier', 'Business sector'),
  ('phone_number', '0940414141', 'Primary contact phone number'),
  ('email', 'contact@racrob.et', 'Official inquiries email'),
  ('address', 'Wereda 03, H.NO. 1263, Office NO.201, Ethio China St, Addis Abeba, Ethiopia', 'Office location address'),
  ('payment_account', '1000', 'Initial/default bank account number for customer payments'),
  ('bank_name', 'Commercial Bank of Ethiopia (CBE)', 'Primary bank name'),
  ('account_holder', 'RACROB Trading PLC', 'Account holder beneficiary name'),
  ('hero_heading', 'Powering Reliable Water Solutions', 'Hero section main headline'),
  ('hero_description', 'From dependable water supply to demanding pumping applications, RACROB provides practical water-pumping solutions designed around performance, reliability and the needs of every customer.', 'Hero introduction copy'),
  ('cta_primary_label', 'Explore Products', 'Hero primary CTA label'),
  ('cta_primary_link', 'products.html', 'Hero primary CTA destination'),
  ('cta_secondary_label', 'Book a Consultation', 'Hero secondary CTA label'),
  ('cta_secondary_link', 'booking.html', 'Hero secondary CTA destination'),
  ('facebook_url', 'https://www.facebook.com/share/1FaYKw8d7y/', 'Official Facebook page'),
  ('twitter_url', '', 'Official Twitter/X handle'),
  ('linkedin_url', '', 'Official LinkedIn profile'),
  ('instagram_url', '', 'Official Instagram profile'),
  ('tiktok_url', '', 'Official TikTok channel'),
  ('google_maps_url', 'https://maps.google.com/?q=Wereda+03+H.NO.+1263+Office+NO.201+Ethio+China+St+Addis+Abeba+Ethiopia', 'Google Maps link'),
  ('google_maps_embed', 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15761.764516315273!2d38.7610!3d9.0050!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x164b85cef0a8d6e9%3A0x6b72a6bca23f46f!2sEthio+China+St%2C+Addis+Ababa%2C+Ethiopia!5e0!3m2!1sen!2set!4v1700000000000', 'Google Maps iframe embed URL'),
  ('footer_description', 'RACROB supplies dependable water pumps and water-pumping solutions for residential, agricultural, commercial and construction applications in Addis Ababa, Ethiopia.', 'Footer summary text')
on conflict (setting_key) do update
  set setting_value = excluded.setting_value;

-- --------------------------------------------------------------
-- SEED INITIAL SLIDESHOW
-- Preserves the strictly required order:
-- 1. u.jpg as FIRST slide
-- 2. o.jpg as SECOND slide
-- 3. p.jpg as THIRD slide
-- 4. Followed by remaining assets. Excludes sami.jpg (logo).
-- --------------------------------------------------------------
insert into public.slides (title_en, title_am, title_om, title_ti, title_sid, title_ar, description_en, description_am, image_url, sort_order, is_active)
values
  (
    'Industrial & High-Pressure Piping Systems',
    'የኢንዱስትሪ እና ከፍተኛ ግፊት የውሃ ቧንቧ ስርዓቶች',
    'Sirna Tuubboo Bishaanii Dhiibbaa Ol’aanaa fi Warshaa',
    'ናይ ኢንዱስትሪን ላዕለዋይ ጸቕጥን ናይ ማይ መትረባት',
    'Wosinshu gari dhibbate buuxo doogo',
    'أنظمة أنابيب ومضخات مياه صناعية عالية الضغط',
    'Precision-engineered ductile iron fittings, flanges, and heavy-duty water pumps built for extreme durability.',
    'ለከፍተኛ ጥንካሬ የተሰሩ ጥራት ያላቸው የብረት ቧንቧ ማገናኛዎች እና የውሃ ፓምፖች።',
    'assets/images/u.jpg',
    1,
    true
  ),
  (
    'RACROB Main Showroom & Distribution Hub',
    'የራክሮብ ዋና ማሳያ እና ማከፋፈያ ማዕከል',
    'Giddugala Agarsiisaa fi Raabsaa RACROB',
    'ናይ ራክሮብ ዋና ምርኢትን መከፋፈሊን ማእከል',
    'RACROB Karsammo Agarsiisonna Baato',
    'معرض ومستودع توزيع مضخات راكروب الرئيسي',
    'Comprehensive range of European-engineered water pumps, high-output generators, and complete accessories.',
    'የተሟላ የአውሮፓ ደረጃ የውሃ ፓምፖች፣ ጀነሬተሮች እና መለዋወጫዎች በኢትዮ ቻይና ጎዳና።',
    'assets/images/o.jpg',
    2,
    true
  ),
  (
    'Engineered Water Infrastructure & Real Estate',
    'የውሃ ምህንድስና መሰረተ ልማት እና ሪል እስቴት',
    'Ijaarsa Bu’uuraalee Bishaanii fi Qabeenya Dhaabbataa',
    'ናይ ማይ ምህንድስና መሰረተ-ልምዓትን ሪል እስቴትን',
    'Woinshu loosi qaccara buxote loosubba',
    'هندسة البنية التحتية للمياه والمشاريع العقارية الكبرى',
    'Supplying municipal fountains, high-rise booster systems, and large commercial water distribution projects.',
    'ለከተማ ፏፏቴዎች፣ ህንፃዎች እና ግዙፍ የውሃ ፕሮጀክቶች አስተማማኝ አቅርቦት።',
    'assets/images/p.jpg',
    3,
    true
  ),
  (
    'High Precision Bronze Flanges & Flow Fittings',
    'ከፍተኛ ጥራት ያላቸው የነሐስ ፍላንጆች እና ማያያዣዎች',
    'Faalaanjii fi Wal-qabsiiftuu Bishaanii',
    'ናይ ብሮንዝ ፍላንጅታትን መተሓሓዚታትን',
    'Wosonshu doogo leellishanno buuxo',
    'فلنجات برونزية عالية الدقة وتوصيلات خطوط المياه',
    'Machined heavy-duty industrial pipe couplings for robust sealing and leak-proof water delivery.',
    'ጠንካራ እና የማይፈሱ የኢንዱስትሪ ደረጃ ማያያዣዎች።',
    'assets/images/q.jpg',
    4,
    true
  ),
  (
    'All-Socket Ductile Iron Tee Junctions',
    'የዳክታይል ብረት ቲ-መገጣጠሚያ ቧንቧዎች',
    'Wal-qabsiiftuu Tuubboo T-Junction',
    'ናይ ዳክታይል ሓጺን ቲ ቅርጺ ዘለዎም መትረባት',
    'T-junction doogo buuxote',
    'تيهات وحديد دكتايل لشبكات توزيع المياه',
    'Reliable municipal and agricultural distribution fittings certified to international EN standards.',
    'ለግብርና እና ለከተማ የውሃ ማከፋፈያ የሚሆኑ አለምአቀፍ ደረጃቸውን የጠበቁ እቃዎች።',
    'assets/images/r.jpg',
    5,
    true
  ),
  (
    'Heavy-Duty Bulk Flow Woltman Meters (350mm)',
    'የኢንዱስትሪ የውሃ ፍሰት መለኪያ ቆጣሪዎች (350 ሚሜ)',
    'Safartuu Ya’aa Bishaanii Warshaa (350mm)',
    'ናይ ማይ ፍሰት መዐቀኒ ቆጸራታት (350mm)',
    'Waate buuxote wosinshu safartto (350mm)',
    'عدادات قياس تدفق المياه التوربينية الضخمة (350 مم)',
    'Accurate Woltman turbine flow meters for main pipeline monitoring, irrigation, and municipal networks.',
    'ለዋና መስመሮች እና ለመስኖ ፕሮጀክቶች ትክክለኛ የፍሰት መለኪያ ቆጣሪዎች።',
    'assets/images/t.jpg',
    6,
    true
  ),
  (
    'Corporate Engineering Consultation & Support',
    'የኮርፖሬት ምህንድስና የማማከር አገልግሎት',
    'Gorsa Injinarummaa fi Deeggarsa Teeknikaa',
    'ናይ ኮርፖሬት ምህንድስና ምኽርን ሓገዝን',
    'Injiniringete gorsote owaante',
    'استشارات هندسية وحلول متقدمة لمشاريع ضخ المياه',
    'Dedicated technical team ready to size, select, and install optimal water pumping equipment.',
    'ለፍላጎትዎ ተስማሚ ፓምፕ ለመምረጥ እና ለመግጠም ዝግጁ የሆነ የምህንድስና ቡድን።',
    'assets/images/w.jpg',
    7,
    true
  )
on conflict do nothing;

-- --------------------------------------------------------------
-- SEED INITIAL PRODUCTS
-- --------------------------------------------------------------
insert into public.products (
  name_en, name_am, name_om, name_ti, name_sid, name_ar,
  description_en, description_am,
  image_url, price, category, model, brand, specifications, featured, sort_order
)
values
  (
    'Heavy Duty Duckfoot 90° Flanged Bend (150x90)',
    'ዳክፉት 90 ዲግሪ የፍላንጅ ቧንቧ ማጠፊያ (150x90)',
    'Tuubboo Daakfuutii 90° (150x90)',
    'ዳክፉት 90 ዲግሪ ናይ ፍላንጅ መተሓሓዚ (150x90)',
    'Duckfoot 90° buuxo (150x90)',
    'كوع دكتايل بقاعدة 90 درجة مع فلنجات (150x90)',
    'Standard BS EN545 H4M DIP ductile iron pipe bend with heavy support base for high pressure pump risers.',
    'ለከፍተኛ ግፊት የውሃ ፓምፕ መስመሮች የሚሆን ጠንካራ የዳክታይል ብረት ማጠፊያ።',
    'assets/images/u.jpg',
    18500.00,
    'Fittings',
    'DF-150-90',
    'RACROB',
    '{"Material": "Ductile Iron BS EN545", "Pressure": "PN16 / PN25", "Size": "150mm x 90mm", "Coating": "Fusion Bonded Epoxy"}'::jsonb,
    true,
    1
  ),
  (
    'Commercial High-Flow Booster Pump & Generator Set',
    'የንግድ ከፍተኛ ፍሰት የውሃ ፓምፕ እና የጀነሬተር ጥምረት',
    'Paampii fi Jeneraetara Bishaanii Humna Ol’aanaa',
    'ናይ ንግዲ ላዕለዋይ ፍሰት ዘለዎ ናይ ማይ ፓምፕን ጀነሬተርን',
    'Lowo hagina paampenna jeneretere',
    'مجموعة مضخة تعزيز التدفق العالي ومولد كهربائي',
    'Italian-engineered high pressure commercial water booster coupled with diesel generator for continuous water delivery.',
    'በጣሊያን ቴክኖሎጂ የተሰራ ከፍተኛ የውሃ ግፊት ፓምፕ ከጀነሬተር ጋር።',
    'assets/images/o.jpg',
    345000.00,
    'Pumps',
    'RCB-BST-500',
    'RACROB Italy',
    '{"Head": "120m", "Flow Rate": "80 m3/h", "Power": "35 kW", "Origin": "Made in Italy"}'::jsonb,
    true,
    2
  ),
  (
    'Industrial Woltman Bulk Water Meter (DN350)',
    'የኢንዱስትሪ የጅምላ ውሃ ፍሰት ቆጣሪ (DN350)',
    'Safartuu Bishaanii Woltman (DN350)',
    'ናይ ኢንዱስትሪ ጅምላ ማይ መዐቀኒ (DN350)',
    'Woltman safartto (DN350)',
    'عداد مياه صناعي توربيني وولتمن (DN350)',
    'Cast iron sealed turbine water meter for high-volume pipelines, irrigation networks, and municipal intakes.',
    'ለትላልቅ የውሃ መስመሮች እና ለመስኖ እርሻዎች የሚሆን ትክክለኛ የውሃ ቆጣሪ።',
    'assets/images/t.jpg',
    82000.00,
    'Meters',
    'WLT-350',
    'RACROB',
    '{"Diameter": "350 mm", "Connection": "Flanged PN16", "Accuracy": "Class B ISO 4064", "Mechanism": "Helical Woltman"}'::jsonb,
    true,
    3
  ),
  (
    'Machined Bronze High-Pressure Pipe Flange',
    'የተስተካከለ የነሐስ ከፍተኛ ግፊት ፍላንጅ',
    'Faalaanjii Biraanzii Dhiibbaa Ol’aanaa',
    'ናይ ብሮንዝ ፍላንጅ ላዕለዋይ ጸቕጢ',
    'Bronze faalaanje dhibbate',
    'فلنجة برونزية معالجة ميكانيكياً لضغط عالي',
    'Precision-bored heavy brass/bronze connection flange engineered for anti-corrosion marine & chemical water systems.',
    'ዝገትን የሚቋቋም ለኬሚካል እና ለውሃ ማጣሪያ ፓምፖች የሚሆን የነሐስ ፍላንጅ።',
    'assets/images/q.jpg',
    9500.00,
    'Flanges',
    'FLG-BRZ-100',
    'RACROB',
    '{"Material": "Cast Bronze / Brass", "Rating": "Class 150 / PN20", "Bore": "4 inch / 100mm"}'::jsonb,
    false,
    4
  ),
  (
    'Ductile Iron All-Socket Tee Junction (DN200)',
    'የዳክታይል ብረት ሶስት አቅጣጫ ማከፋፈያ (DN200)',
    'Wal-qabsiiftuu Tuubboo T-Junction (DN200)',
    'ናይ ዳክታይል ሓጺን ሰለስተ ኣንፈት መከፋፈሊ (DN200)',
    'Tee junction doogo (DN200)',
    'تيه حديد دكتايل كامل التوصيل السريع (DN200)',
    'Robust socketed T-fitting with EPDM gasket seating for fast, secure, leak-free pipeline branching.',
    'ለፈጣን እና አስተማማኝ የውሃ መስመር ማከፋፈያ የሚያገለግል የቲ ቅርጽ ማያያዣ።',
    'assets/images/r.jpg',
    14800.00,
    'Fittings',
    'TEE-SOC-200',
    'RACROB',
    '{"Standard": "ISO 2531 / EN 545", "Nominal Diameter": "DN200", "Gasket": "EPDM Rubber Ring"}'::jsonb,
    false,
    5
  ),
  (
    '4-Way Ductile Iron Cross Fitting (DN160 PN16)',
    'ባለ አራት አቅጣጫ የዳክታይል ብረት ማገናኛ (DN160)',
    'Wal-qabsiiftuu Kallattii Afurii (DN160)',
    'ናይ ኣርባዕተ ኣንፈት መተሓሓዚ ሓጺን (DN160)',
    '4-way cross buuxo (DN160)',
    'صليب دكتايل رباعي الاتجاهات (DN160 PN16)',
    'Heavy-duty epoxy-coated cross junction fitting for multi-directional distribution manifolds.',
    'በአራቱም አቅጣጫ ውሃ ለማከፋፈል የሚያስችል በኤፖክሲ ቀለም የተሸፈነ ማገናኛ።',
    'assets/images/y.jpg',
    21500.00,
    'Fittings',
    'CRS-160-PN16',
    'RACROB',
    '{"Specification": "EN545 / ISO2531", "Rating": "PN16", "Size": "DN160", "Finish": "Red Protective Epoxy"}'::jsonb,
    true,
    6
  ),
  (
    'Multi-Stage High-Rise Booster Water Pump',
    'ለፎቅ ህንፃዎች የሚሆን ባለ ብዙ ደረጃ የውሃ መግፊያ ፓምፕ',
    'Paampii Bishaanii Gamoo Dhedheeraa',
    'ናይ ልዑላት ህንጻታት ናይ ማይ ደፋኢ ፓምፕ',
    'High-rise booster paampe',
    'مضخة متعددة المراحل لتعزيز ضغط المياه في الأبراج',
    'Vertical multi-stage stainless steel booster pump delivering high head water supply for commercial towers.',
    'ረዣዥም ህንፃዎች ድረስ ውሃ በከፍተኛ ግፊት ለማድረስ የሚያስችል አይዝጌ ብረት ፓምፕ።',
    'assets/images/p.jpg',
    195000.00,
    'Pumps',
    'RCB-VMS-80',
    'RACROB',
    '{"Head": "160m", "Stages": "8 Stage Stainless", "Max Pressure": "25 Bar", "Motor": "Three-Phase 15kW"}'::jsonb,
    true,
    7
  ),
  (
    'Deep Well Submersible Solar & Electric Pump',
    'የጥልቅ ጉድጓድ የፀሐይ እና የኤሌክትሪክ የውሃ ፓምፕ',
    'Paampii Bishaanii Boolla Gad-fagoo Aduu fi Elektirikii',
    'ናይ መዓሙቕ ዒላ ናይ ፀሓይን ኤሌክትሪክን ማይ ፓምፕ',
    'Solar & electric boolla paampe',
    'مضخة غاطسة للآبار الارتوازية تعمل بالطاقة الشمسية والكهرباء',
    'Heavy-duty borehole submersible pump suitable for remote farms, community water supplies, and solar systems.',
    'ለመጠጥ ውሃ እና ለእርሻ የሚያገለግል የጥልቅ ጉድጓድ ሰመጥ ፓምፕ።',
    'assets/images/i.jpg',
    128000.00,
    'Submersible',
    'RCB-SUB-400',
    'RACROB',
    '{"Immersion Depth": "Up to 250m", "Discharge": "3 inch", "Power Source": "Dual AC / Solar DC", "Body": "AISI 304 Stainless"}'::jsonb,
    false,
    8
  )
on conflict do nothing;

-- --------------------------------------------------------------
-- SEED INITIAL APPLICATIONS
-- --------------------------------------------------------------
insert into public.applications (
  name_en, name_am, name_om, name_ti, name_sid, name_ar,
  description_en, description_am,
  video_url, thumbnail_url, sort_order, is_active
)
values
  (
    'Agricultural Irrigation & Farm Water Supply',
    'የግብርና መስኖ እና የእርሻ ውሃ አቅርቦት',
    'Bishaan Qonnaa fi Misooma Masnoo',
    'ናይ ሕርሻ መስኖን ማይ ቀረብን',
    'Qottote wosonshunna masno',
    'الري الزراعي وإمدادات مياه المزارع والمحاصيل',
    'High-capacity centrifugal and submersible pumps delivering continuous water flow across large agricultural fields and drip irrigation networks.',
    'ለትላልቅ እርሻዎች እና የመስኖ መስመሮች አስተማማኝ የሆነ የውሃ ፍሰት የሚሰጡ ፓምፖች።',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    'assets/images/o.jpg',
    1,
    true
  ),
  (
    'Construction & Dewatering Operations',
    'የግንባታ ስራ እና የቆሸሸ ውሃ ማስወገድ',
    'Ijaarsa fi Bishaan Boollaa Keessaa Baasuu',
    'ናይ ህንጻ ስራሕን ማይ ምውጻእን',
    'Ijaarsunna waate baasa',
    'عمليات البناء ونزح المياه الجوفية من مواقع العمل',
    'Heavy-duty self-priming slurry and trash pumps designed to drain excavated basements, trenches, and construction zones quickly.',
    'የግንባታ ጉድጓዶችን እና ምድር ቤቶችን በፍጥነት ለማድረቅ የሚያገለግሉ ጠንካራ ፓምፖች።',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    'assets/images/u.jpg',
    2,
    true
  ),
  (
    'Commercial High-Rise & Real Estate Water Systems',
    'የንግድ ህንፃዎች እና የሪል እስቴት የውሃ ስርዓት',
    'Bishaan Gamoo Daldalaa fi Qabeenya Dhaabbataa',
    'ናይ ንግዲ ህንጻታትን ሪል እስቴትን ማይ ስርዓት',
    'Gamote lowo buuxote loosubba',
    'أنظمة إمداد وضغط المياه للأبراج التجارية والمجمعات السكنية',
    'Automated constant-pressure booster pumps and hydro-pneumatic systems maintaining uniform water pressure on every building floor.',
    'በሁሉም የህንፃው ወለሎች ላይ ወጥ የሆነ የውሃ ግፊት የሚሰጡ ዘመናዊ የፓምፕ ስርዓቶች።',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    'assets/images/p.jpg',
    3,
    true
  ),
  (
    'Municipal Pipeline Distribution & Bulk Water Works',
    'የከተማ የውሃ ማከፋፈያ መስመሮች እና ዋና አውታሮች',
    'Sirna Raabsaa Bishaanii Magaalaa',
    'ናይ ከተማ ማይ መከፋፈሊ መትረባት',
    'Magaalote buuxote doogo',
    'شبكات توزيع مياه الشرب للمدن والمشاريع البلدية الكبرى',
    'High-efficiency inline split-case pumps and ductile iron fittings engineered for public utilities, treatment plants, and reservoirs.',
    'ለከተሞች እና ለማዘጋጃ ቤቶች የመጠጥ ውሃ ማከፋፈያ የሚሆኑ ግዙፍ ፓምፖች እና መገጣጠሚያዎች።',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    'assets/images/r.jpg',
    4,
    true
  ),
  (
    'Residential Boosting & Clean Domestic Water',
    'ለመኖሪያ ቤቶች የውሃ ግፊት ማሳደጊያ ፓምፖች',
    'Bishaan Mana Jireenyaa fi Dhiibbaa Dabaluu',
    'ናይ መንበሪ ኣባይቲ ማይ ጸቕጢ መዕበዪ',
    'Minoote buuxote paampubba',
    'تعزيز ضغط المياه المنزلية والاستخدامات السكنية النظيفة',
    'Quiet, compact, energy-efficient booster pumps ensuring strong shower and tap pressure even with low municipal line pressure.',
    'የመኖሪያ ቤቶችን የውሃ ግፊት የሚጨምሩ ድምፅ አልባ እና ዘመናዊ ፓምፖች።',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    'assets/images/w.jpg',
    5,
    true
  ),
  (
    'Bulk Water Measurement & Mainline Monitoring',
    'የጅምላ ውሃ ፍሰት መቆጣጠሪያ እና የመስመር ክትትል',
    'Hordoffii fi Safara Ya’aa Bishaanii',
    'ናይ ጅምላ ማይ ቁጽጽርን ምክትታልን',
    'Safartote wosonsho looso',
    'قياس التدفق والتحكم في خطوط النقل الرئيسية',
    'Flanged turbine Woltman meters and telemetry integration enabling precise billing, leak tracking, and water loss reduction.',
    'የውሃ ብክነትን ለመቀነስ እና ፍሰትን በትክክል ለመለካት የሚያስችሉ ቆጣሪዎች።',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    'assets/images/t.jpg',
    6,
    true
  )
on conflict do nothing;

-- ==============================================================
-- INSTRUCTIONS FOR FIRST ADMIN SETUP:
-- 1. Create a user in Supabase Authentication (Email & Password).
-- 2. Copy the newly created User UUID from auth.users.
-- 3. Execute the following SQL statement replacing the UUID:
--
--    INSERT INTO public.profiles (id, email, full_name, role)
--    VALUES ('ce4659ad-199f-4c55-9b2b-06d337af6d37', 'admin@racrob.et', 'RACROB Administrator', 'admin')
--    ON CONFLICT (id) DO UPDATE SET role = 'admin';
--
-- 4. Open login.html in your browser, enter your credentials, and
--    you will be securely redirected to admin.html!
-- ==============================================================
