create table if not exists appointment_services (
  appointment_id uuid not null references appointments(id) on delete cascade,
  service_id uuid not null references services(id) on delete restrict,
  position integer not null check (position > 0),
  price_amount integer not null check (price_amount >= 0),
  deposit_amount integer not null check (deposit_amount >= 0),
  duration_minutes integer not null check (duration_minutes > 0),
  created_at timestamptz not null default now(),
  primary key (appointment_id, service_id),
  unique (appointment_id, position)
);

insert into appointment_services (
  appointment_id,
  service_id,
  position,
  price_amount,
  deposit_amount,
  duration_minutes
)
select
  a.id,
  a.service_id,
  1,
  a.total_amount,
  a.deposit_amount,
  s.duration_minutes
from appointments a
join services s on s.id = a.service_id
where not exists (
  select 1
  from appointment_services aps
  where aps.appointment_id = a.id
);

create or replace function create_booking_hold_with_services(
  p_business_id uuid,
  p_professional_id uuid,
  p_service_id uuid,
  p_services jsonb,
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
  if jsonb_typeof(p_services) <> 'array' or jsonb_array_length(p_services) = 0 then
    raise exception 'At least one service is required' using errcode = '22023';
  end if;

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

  insert into appointment_services (
    appointment_id,
    service_id,
    position,
    price_amount,
    deposit_amount,
    duration_minutes
  )
  select
    v_appointment_id,
    service_id,
    position,
    price_amount,
    deposit_amount,
    duration_minutes
  from jsonb_to_recordset(p_services) as service_items(
    service_id uuid,
    position integer,
    price_amount integer,
    deposit_amount integer,
    duration_minutes integer
  );

  return v_appointment_id;
exception
  when exclusion_violation then
    raise exception 'Appointment slot is no longer available' using errcode = '23P01';
end;
$$;

alter table appointment_services enable row level security;
