insert into businesses (
  id,
  name,
  slug,
  address,
  map_url,
  contact_email,
  contact_phone,
  timezone,
  active,
  mercado_pago_credential_key
) values (
  '11111111-1111-4111-8111-111111111111',
  'Achul_Nails',
  'achul-nails',
  'Direccion a confirmar',
  null,
  'azul@example.com',
  '+5490000000000',
  'America/Argentina/Buenos_Aires',
  true,
  'ACHUL'
) on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  address = excluded.address,
  active = excluded.active,
  mercado_pago_credential_key = excluded.mercado_pago_credential_key;

insert into professionals (
  id,
  business_id,
  name,
  active
) values (
  '33333333-3333-4333-8333-333333333333',
  '11111111-1111-4111-8111-111111111111',
  'Azul',
  true
) on conflict (id) do update set
  name = excluded.name,
  active = excluded.active;

insert into services (
  id,
  business_id,
  name,
  description,
  duration_minutes,
  price_amount,
  deposit_type,
  deposit_value,
  active
) values (
  '22222222-2222-4222-8222-222222222222',
  '11111111-1111-4111-8111-111111111111',
  'Manicure semipermanente',
  'Esmaltado semipermanente con preparacion de unas.',
  60,
  5000,
  'fixed',
  1500,
  true
) on conflict (id) do update set
  name = excluded.name,
  duration_minutes = excluded.duration_minutes,
  price_amount = excluded.price_amount,
  deposit_type = excluded.deposit_type,
  deposit_value = excluded.deposit_value,
  active = excluded.active;

delete from business_hours
where business_id = '11111111-1111-4111-8111-111111111111';

insert into business_hours (
  business_id,
  professional_id,
  day_of_week,
  start_time,
  end_time,
  active
)
select
  '11111111-1111-4111-8111-111111111111',
  '33333333-3333-4333-8333-333333333333',
  day_of_week,
  time '09:00',
  time '18:00',
  true
from generate_series(1, 5) as day_of_week;
