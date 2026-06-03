import type { SupabaseClient } from "@supabase/supabase-js";

export type ProcessedWhatsAppMessageRepository = {
  hasProcessedMessage(messageId: string): Promise<boolean>;
  recordProcessedMessage(input: {
    messageId: string;
    businessId: string;
    phone: string;
  }): Promise<boolean>;
};

export class SupabaseProcessedWhatsAppMessageRepository implements ProcessedWhatsAppMessageRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async hasProcessedMessage(messageId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("whatsapp_processed_messages")
      .select("message_id")
      .eq("message_id", messageId)
      .maybeSingle();

    if (error?.code === "42P01" || error?.code === "PGRST205") {
      return false;
    }
    if (error) {
      throw error;
    }

    return Boolean(data);
  }

  async recordProcessedMessage(input: {
    messageId: string;
    businessId: string;
    phone: string;
  }): Promise<boolean> {
    const { error } = await this.supabase.from("whatsapp_processed_messages").insert({
      message_id: input.messageId,
      business_id: input.businessId,
      phone: input.phone
    });

    if (error?.code === "23505") {
      return false;
    }
    if (error?.code === "42P01" || error?.code === "PGRST205") {
      return true;
    }
    if (error) {
      throw error;
    }

    return true;
  }
}
