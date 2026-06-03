create table if not exists business_branding (
  business_id uuid primary key references businesses(id) on delete cascade,
  primary_color text not null default '#24594c',
  hero_text text not null default 'Turnos confirmados para que tu horario quede cuidado desde el primer clic.',
  visual_mode text not null default 'default' check (visual_mode in ('default', 'compact')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  check (length(hero_text) between 10 and 180)
);

alter table business_branding enable row level security;

insert into business_branding (business_id, primary_color, hero_text, visual_mode)
select
  id,
  '#24594c',
  'Turnos confirmados para que tu horario quede cuidado desde el primer clic.',
  'default'
from businesses
where slug = 'achul-nails'
on conflict (business_id) do nothing;
