create table if not exists whatsapp_processed_messages (
  message_id text primary key,
  business_id uuid not null references businesses(id) on delete cascade,
  phone text not null,
  processed_at timestamptz not null default now()
);

create index if not exists whatsapp_processed_messages_business_phone_idx
  on whatsapp_processed_messages (business_id, phone);

alter table whatsapp_processed_messages enable row level security;
