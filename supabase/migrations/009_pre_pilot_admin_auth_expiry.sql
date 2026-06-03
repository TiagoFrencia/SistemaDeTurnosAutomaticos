create table if not exists business_admins (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('owner', 'admin')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create index if not exists business_admins_user_id_idx on business_admins(user_id);
create index if not exists business_admins_business_id_idx on business_admins(business_id);

alter table business_admins enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'business_admins'
      and policyname = 'business_admins_select_own'
  ) then
    create policy business_admins_select_own
      on business_admins
      for select
      to authenticated
      using (user_id = auth.uid());
  end if;
end $$;
