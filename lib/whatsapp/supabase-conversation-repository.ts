import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  WhatsAppBusiness,
  WhatsAppConversation,
  WhatsAppConversationContext,
  WhatsAppConversationRepository,
  WhatsAppConversationState
} from "@/lib/whatsapp/conversation-service";

type DatabaseRow = Record<string, unknown>;

export class SupabaseWhatsAppConversationRepository implements WhatsAppConversationRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async loadBusinessBySlug(slug: string): Promise<WhatsAppBusiness | null> {
    const { data, error } = await this.supabase
      .from("businesses")
      .select("id,name,slug,active")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (!data) {
      return null;
    }

    return {
      id: stringField(data, "id"),
      name: stringField(data, "name"),
      slug: stringField(data, "slug"),
      active: booleanField(data, "active")
    };
  }

  async loadConversation(input: {
    businessId: string;
    phone: string;
  }): Promise<WhatsAppConversation | null> {
    const { data, error } = await this.supabase
      .from("whatsapp_conversations")
      .select("business_id,phone,state,context,expires_at")
      .eq("business_id", input.businessId)
      .eq("phone", input.phone)
      .maybeSingle();

    if (error?.code === "42P01" || error?.code === "PGRST205") {
      return null;
    }
    if (error) {
      throw error;
    }
    if (!data) {
      return null;
    }

    return {
      businessId: stringField(data, "business_id"),
      phone: stringField(data, "phone"),
      state: stateField(data, "state"),
      context: contextField(data, "context"),
      expiresAt: stringField(data, "expires_at")
    };
  }

  async saveConversation(conversation: WhatsAppConversation & { lastMessage?: string }): Promise<void> {
    const { error } = await this.supabase.from("whatsapp_conversations").upsert(
      {
        business_id: conversation.businessId,
        phone: conversation.phone,
        state: conversation.state,
        context: conversation.context,
        last_message: conversation.lastMessage ?? null,
        expires_at: conversation.expiresAt,
        updated_at: new Date().toISOString()
      },
      { onConflict: "business_id,phone" }
    );

    if (error) {
      throw error;
    }
  }
}

function stringField(row: DatabaseRow, key: string): string {
  const value = row[key];
  if (typeof value !== "string") {
    throw new Error(`Expected ${key} to be a string`);
  }
  return value;
}

function booleanField(row: DatabaseRow, key: string): boolean {
  const value = row[key];
  if (typeof value !== "boolean") {
    throw new Error(`Expected ${key} to be a boolean`);
  }
  return value;
}

function stateField(row: DatabaseRow, key: string): WhatsAppConversationState {
  const value = row[key];
  if (
    typeof value === "string" &&
    [
      "greeting",
      "selecting_services",
      "selecting_professional",
      "selecting_day",
      "selecting_slot",
      "collecting_name",
      "collecting_email",
      "confirming_booking",
      "completed"
    ].includes(value)
  ) {
    return value as WhatsAppConversationState;
  }

  return "greeting";
}

function contextField(row: DatabaseRow, key: string): WhatsAppConversationContext {
  const value = row[key];
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as WhatsAppConversationContext)
    : {};
}
