create extension if not exists btree_gist;

do $$
begin
  if to_regclass('public.businesses') is null and to_regclass('public.clinics') is not null then
    alter table clinics rename to legacy_clinics;
  end if;
  if to_regclass('public.businesses') is null and to_regclass('public.clinic_info') is not null then
    alter table clinic_info rename to legacy_clinic_info;
  end if;
  if to_regclass('public.businesses') is null and to_regclass('public.clinic_channels') is not null then
    alter table clinic_channels rename to legacy_clinic_channels;
  end if;
  if to_regclass('public.businesses') is null and to_regclass('public.bot_conversations') is not null then
    alter table bot_conversations rename to legacy_bot_conversations;
  end if;
  if to_regclass('public.businesses') is null and to_regclass('public.patients') is not null then
    alter table patients rename to legacy_patients;
  end if;
  if to_regclass('public.businesses') is null and to_regclass('public.blocked_days') is not null then
    alter table blocked_days rename to legacy_blocked_days;
  end if;
  if to_regclass('public.businesses') is null and to_regclass('public.appointments') is not null then
    alter table appointments rename to legacy_appointments;
  end if;
  if to_regclass('public.businesses') is null and to_regclass('public.services') is not null then
    alter table services rename to legacy_services;
  end if;
end $$;

create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  address text,
  map_url text,
  contact_email text,
  contact_phone text,
  timezone text not null default 'America/Argentina/Buenos_Aires',
  active boolean not null default true,
  mercado_pago_credential_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists professionals (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  bio text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  description text,
  duration_minutes integer not null check (duration_minutes > 0),
  price_amount integer not null check (price_amount >= 0),
  deposit_type text not null check (deposit_type in ('fixed', 'percentage')),
  deposit_value integer not null check (deposit_value >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists business_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  professional_id uuid references professionals(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  active boolean not null default true,
  check (start_time < end_time)
);

create table if not exists availability_blocks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  professional_id uuid references professionals(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  reason text,
  created_at timestamptz not null default now(),
  check (start_at < end_at)
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  full_name text not null,
  phone text not null,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  professional_id uuid not null references professionals(id) on delete restrict,
  service_id uuid not null references services(id) on delete restrict,
  customer_id uuid not null references customers(id) on delete restrict,
  start_at timestamptz not null,
  end_at timestamptz not null,
  slot_range tstzrange generated always as (tstzrange(start_at, end_at, '[)')) stored,
  status text not null check (
    status in (
      'pending_payment',
      'confirmed',
      'payment_failed',
      'payment_expired',
      'cancelled',
      'attended',
      'no_show'
    )
  ),
  source text not null default 'public' check (source in ('public', 'manual')),
  deposit_required boolean not null default true,
  total_amount integer not null check (total_amount >= 0),
  deposit_amount integer not null check (deposit_amount >= 0),
  remaining_amount integer not null check (remaining_amount >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_at < end_at)
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'appointments_no_overlapping_blocking_slots'
  ) then
    alter table appointments
      add constraint appointments_no_overlapping_blocking_slots
      exclude using gist (
        business_id with =,
        professional_id with =,
        slot_range with &&
      )
      where (status in ('pending_payment', 'confirmed'));
  end if;
end $$;

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  appointment_id uuid not null references appointments(id) on delete cascade,
  provider text not null default 'mercado_pago',
  provider_preference_id text,
  provider_payment_id text unique,
  status text not null check (status in ('pending', 'approved', 'rejected', 'cancelled', 'expired', 'refunded')),
  amount integer not null check (amount >= 0),
  currency text not null default 'ARS',
  raw_status text,
  raw_status_detail text,
  webhook_received_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  appointment_id uuid references appointments(id) on delete set null,
  channel text not null check (channel in ('email', 'whatsapp', 'sms')),
  template_key text not null,
  recipient text not null,
  payload jsonb not null default '{}',
  status text not null check (status in ('queued', 'sent', 'failed')),
  provider_message_id text,
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create or replace function create_booking_hold(
  p_business_id uuid,
  p_professional_id uuid,
  p_service_id uuid,
  p_customer_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_total_amount integer,
  p_deposit_amount integer
) returns uuid
language plpgsql
as $$
declare
  v_appointment_id uuid;
begin
  insert into appointments (
    business_id,
    professional_id,
    service_id,
    customer_id,
    start_at,
    end_at,
    status,
    source,
    deposit_required,
    total_amount,
    deposit_amount,
    remaining_amount
  ) values (
    p_business_id,
    p_professional_id,
    p_service_id,
    p_customer_id,
    p_start_at,
    p_end_at,
    'pending_payment',
    'public',
    true,
    p_total_amount,
    p_deposit_amount,
    p_total_amount - p_deposit_amount
  )
  returning id into v_appointment_id;

  return v_appointment_id;
exception
  when exclusion_violation then
    raise exception 'Appointment slot is no longer available' using errcode = '23P01';
end;
$$;

alter table businesses enable row level security;
alter table professionals enable row level security;
alter table services enable row level security;
alter table business_hours enable row level security;
alter table availability_blocks enable row level security;
alter table customers enable row level security;
alter table appointments enable row level security;
alter table payments enable row level security;
alter table notifications enable row level security;
