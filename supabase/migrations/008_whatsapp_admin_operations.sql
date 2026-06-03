alter table whatsapp_conversations
  drop constraint if exists whatsapp_conversations_state_check;

alter table whatsapp_conversations
  add constraint whatsapp_conversations_state_check
  check (
    state in (
      'greeting',
      'selecting_services',
      'selecting_professional',
      'selecting_day',
      'selecting_slot',
      'collecting_name',
      'collecting_email',
      'confirming_booking',
      'completed'
    )
  );
