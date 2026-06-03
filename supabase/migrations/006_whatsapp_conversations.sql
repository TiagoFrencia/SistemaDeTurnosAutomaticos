create table if not exists whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  phone text not null,
  state text not null check (
    state in (
      'greeting',
      'selecting_services',
      'selecting_professional',
      'selecting_day',
      'selecting_slot',
      'collecting_name',
      'collecting_email',
      'completed'
    )
  ),
  context jsonb not null default '{}',
  last_message text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, phone)
);

create index if not exists whatsapp_conversations_business_phone_idx
  on whatsapp_conversations (business_id, phone);

create index if not exists whatsapp_conversations_expires_at_idx
  on whatsapp_conversations (expires_at);

alter table whatsapp_conversations enable row level security;
