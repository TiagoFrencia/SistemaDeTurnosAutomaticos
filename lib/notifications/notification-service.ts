import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationChannel, NotificationTemplateKey } from "@/lib/domain/types";

export type NotificationRequest = {
  businessId: string;
  appointmentId?: string;
  channel: NotificationChannel;
  templateKey: NotificationTemplateKey;
  recipient: string;
  payload: Record<string, unknown>;
};

export type NotificationResult = {
  status: "sent" | "queued" | "failed";
  providerMessageId?: string;
  error?: string;
};

export type NotificationRecord = NotificationRequest & NotificationResult;

export type NotificationAdapter = {
  channel: NotificationChannel;
  send(request: NotificationRequest): Promise<NotificationResult>;
};

export type NotificationLog = {
  record(request: NotificationRequest, result: NotificationResult): Promise<void>;
};

export class InMemoryNotificationLog implements NotificationLog {
  readonly records: NotificationRecord[] = [];

  async record(request: NotificationRequest, result: NotificationResult): Promise<void> {
    this.records.push({ ...request, ...result });
  }
}

export class SupabaseNotificationLog implements NotificationLog {
  constructor(private readonly database: SupabaseClient) {}

  async record(request: NotificationRequest, result: NotificationResult): Promise<void> {
    const { error } = await this.database.from("notifications").insert({
      business_id: request.businessId,
      appointment_id: request.appointmentId ?? null,
      channel: request.channel,
      template_key: request.templateKey,
      recipient: request.recipient,
      payload: request.payload,
      status: result.status,
      provider_message_id: result.providerMessageId ?? null,
      error: result.error ?? null,
      sent_at: result.status === "sent" ? new Date().toISOString() : null
    });

    if (error) {
      throw error;
    }
  }
}

export class NotificationService {
  private readonly adapters: Map<NotificationChannel, NotificationAdapter>;

  constructor(adapters: NotificationAdapter[], private readonly log: NotificationLog) {
    this.adapters = new Map(adapters.map((adapter) => [adapter.channel, adapter]));
  }

  hasAdapter(channel: NotificationChannel): boolean {
    return this.adapters.has(channel);
  }

  async send(request: NotificationRequest): Promise<NotificationResult> {
    const adapter = this.adapters.get(request.channel);

    if (!adapter) {
      const result = {
        status: "failed" as const,
        error: `No notification adapter registered for channel ${request.channel}`
      };
      await this.log.record(request, result);
      return result;
    }

    const result = await adapter.send(request);
    await this.log.record(request, result);
    return result;
  }
}
