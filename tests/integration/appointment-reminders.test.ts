import { describe, expect, it } from "vitest";
import {
  sendAppointmentReminders,
  type AppointmentReminderRepository,
  type ReminderAppointment
} from "@/lib/notifications/appointment-reminder-service";
import {
  InMemoryNotificationLog,
  NotificationService,
  type NotificationAdapter
} from "@/lib/notifications/notification-service";

describe("appointment reminders", () => {
  it("sends one WhatsApp reminder for upcoming confirmed appointments and stays idempotent", async () => {
    const repository = new FakeReminderRepository([
      {
        id: "apt-1",
        businessId: "biz-1",
        customerName: "Ana Perez",
        customerPhone: "+5491111111111",
        customerEmail: "ana@example.com",
        serviceName: "Manicure",
        startAt: "2026-06-02T09:00:00-03:00"
      }
    ]);
    const log = new InMemoryNotificationLog();
    const notifications = new NotificationService([sentWhatsAppAdapter()], log);

    const first = await sendAppointmentReminders(repository, notifications, new Date("2026-06-01T09:00:00-03:00"));
    repository.recordSeenFrom(log.records);
    const second = await sendAppointmentReminders(repository, notifications, new Date("2026-06-01T09:00:00-03:00"));

    expect(first).toEqual({ scanned: 1, sent: 1 });
    expect(second).toEqual({ scanned: 1, sent: 0 });
    expect(log.records).toMatchObject([
      {
        appointmentId: "apt-1",
        channel: "whatsapp",
        templateKey: "booking.reminder",
        recipient: "+5491111111111",
        status: "sent"
      }
    ]);
  });

  it("falls back to email when WhatsApp fails", async () => {
    const repository = new FakeReminderRepository([
      {
        id: "apt-1",
        businessId: "biz-1",
        customerName: "Ana Perez",
        customerPhone: "+5491111111111",
        customerEmail: "ana@example.com",
        serviceName: "Manicure",
        startAt: "2026-06-02T09:00:00-03:00"
      }
    ]);
    const log = new InMemoryNotificationLog();
    const notifications = new NotificationService([failedWhatsAppAdapter(), sentEmailAdapter()], log);

    await sendAppointmentReminders(repository, notifications, new Date("2026-06-01T09:00:00-03:00"));

    expect(log.records).toMatchObject([
      { channel: "whatsapp", status: "failed" },
      { channel: "email", status: "sent" }
    ]);
  });
});

function sentWhatsAppAdapter(): NotificationAdapter {
  return {
    channel: "whatsapp",
    send: async () => ({ status: "sent", providerMessageId: "wa-1" })
  };
}

function failedWhatsAppAdapter(): NotificationAdapter {
  return {
    channel: "whatsapp",
    send: async () => ({ status: "failed", error: "provider unavailable" })
  };
}

function sentEmailAdapter(): NotificationAdapter {
  return {
    channel: "email",
    send: async () => ({ status: "sent", providerMessageId: "email-1" })
  };
}

class FakeReminderRepository implements AppointmentReminderRepository {
  private readonly seen = new Set<string>();

  constructor(private readonly appointments: ReminderAppointment[]) {}

  async loadAppointmentsForReminderWindow(): Promise<ReminderAppointment[]> {
    return this.appointments;
  }

  async hasNotification(input: {
    appointmentId: string;
    channel: "email" | "whatsapp" | "sms";
    templateKey: "booking.reminder";
  }): Promise<boolean> {
    return this.seen.has(`${input.appointmentId}:${input.channel}:${input.templateKey}`);
  }

  recordSeenFrom(records: Array<{ appointmentId?: string; channel: string; templateKey: string }>): void {
    for (const record of records) {
      if (record.appointmentId) {
        this.seen.add(`${record.appointmentId}:${record.channel}:${record.templateKey}`);
      }
    }
  }
}
