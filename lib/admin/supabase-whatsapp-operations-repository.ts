import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AdminWhatsAppConversation,
  AdminWhatsAppConversationContext,
  AdminWhatsAppConversationState,
  AdminWhatsAppRepository
} from "@/lib/admin/whatsapp-operations-service";

type DatabaseRow = Record<string, unknown>;

export class SupabaseAdminWhatsAppRepository implements AdminWhatsAppRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findBusinessBySlug(slug: string): Promise<{ id: string; slug: string } | null> {
    const { data, error } = await this.supabase
      .from("businesses")
      .select("id,slug")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? { id: stringField(data, "id"), slug: stringField(data, "slug") } : null;
  }

  async listConversations(input: {
    businessId: string;
    phone?: string;
    state?: AdminWhatsAppConversationState;
    limit: number;
  }): Promise<Array<Omit<AdminWhatsAppConversation, "stateLabel" | "suggestedAction" | "displayContext" | "processedMessagesCount" | "isExpired">>> {
    let query = this.supabase
      .from("whatsapp_conversations")
      .select("id,business_id,phone,state,context,last_message,expires_at,created_at,updated_at")
      .eq("business_id", input.businessId)
      .order("updated_at", { ascending: false })
      .limit(input.limit);

    if (input.phone) {
      query = query.ilike("phone", `%${input.phone.replace(/^\+/, "")}%`);
    }

    if (input.state) {
      query = query.eq("state", input.state);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    return Array.isArray(data) ? data.map(mapConversationRow) : [];
  }

  async findServiceNames(input: { businessId: string; serviceIds: string[] }): Promise<Record<string, string>> {
    if (input.serviceIds.length === 0) {
      return {};
    }

    const { data, error } = await this.supabase
      .from("services")
      .select("id,name")
      .eq("business_id", input.businessId)
      .in("id", input.serviceIds);

    if (error) {
      throw error;
    }

    return rowsToNameMap(data);
  }

  async findProfessionalNames(input: { businessId: string; professionalIds: string[] }): Promise<Record<string, string>> {
    if (input.professionalIds.length === 0) {
      return {};
    }

    const { data, error } = await this.supabase
      .from("professionals")
      .select("id,name")
      .eq("business_id", input.businessId)
      .in("id", input.professionalIds);

    if (error) {
      throw error;
    }

    return rowsToNameMap(data);
  }

  async countProcessedMessages(input: { businessId: string; phones: string[] }): Promise<Record<string, number>> {
    if (input.phones.length === 0) {
      return {};
    }

    const { data, error } = await this.supabase
      .from("whatsapp_processed_messages")
      .select("phone")
      .eq("business_id", input.businessId)
      .in("phone", input.phones);

    if (error) {
      throw error;
    }

    return (Array.isArray(data) ? data : []).reduce<Record<string, number>>((counts, row) => {
      const phone = stringField(row, "phone");
      counts[phone] = (counts[phone] ?? 0) + 1;
      return counts;
    }, {});
  }

  async resetConversation(input: {
    businessId: string;
    phone: string;
    expiresAt: string;
  }): Promise<"updated" | "not_found"> {
    const { data, error } = await this.supabase
      .from("whatsapp_conversations")
      .update({
        state: "greeting",
        context: {},
        last_message: "admin_reset",
        expires_at: input.expiresAt,
        updated_at: new Date().toISOString()
      })
      .eq("business_id", input.businessId)
      .eq("phone", input.phone)
      .select("id");

    if (error) {
      throw error;
    }

    return Array.isArray(data) && data.length > 0 ? "updated" : "not_found";
  }
}

function mapConversationRow(
  row: DatabaseRow
): Omit<AdminWhatsAppConversation, "stateLabel" | "suggestedAction" | "displayContext" | "processedMessagesCount" | "isExpired"> {
  return {
    id: stringField(row, "id"),
    businessId: stringField(row, "business_id"),
    phone: stringField(row, "phone"),
    state: stateField(row, "state"),
    context: contextField(row, "context"),
    lastMessage: nullableStringField(row, "last_message"),
    expiresAt: stringField(row, "expires_at"),
    createdAt: stringField(row, "created_at"),
    updatedAt: stringField(row, "updated_at")
  };
}

function rowsToNameMap(data: unknown): Record<string, string> {
  return (Array.isArray(data) ? data : []).reduce<Record<string, string>>((map, row) => {
    map[stringField(row, "id")] = stringField(row, "name");
    return map;
  }, {});
}

function stringField(row: DatabaseRow, key: string): string {
  const value = row[key];
  if (typeof value !== "string") {
    throw new Error(`Expected ${key} to be a string`);
  }
  return value;
}

function nullableStringField(row: DatabaseRow, key: string): string | null {
  const value = row[key];
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "string") {
    throw new Error(`Expected ${key} to be a string`);
  }
  return value;
}

function stateField(row: DatabaseRow, key: string): AdminWhatsAppConversationState {
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
    return value as AdminWhatsAppConversationState;
  }

  return "greeting";
}

function contextField(row: DatabaseRow, key: string): AdminWhatsAppConversationContext {
  const value = row[key];
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as AdminWhatsAppConversationContext)
    : {};
}
