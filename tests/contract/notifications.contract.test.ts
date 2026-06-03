import { describe, expect, it } from "vitest";
import {
  InMemoryNotificationLog,
  NotificationService,
  type NotificationAdapter
} from "@/lib/notifications/notification-service";
import { FakeWhatsAppGateway, WhatsAppNotificationAdapter } from "@/lib/notifications/whatsapp-adapter";

describe("NotificationService contract", () => {
  it("dispatches through the registered email adapter and records the attempt", async () => {
    const adapter: NotificationAdapter = {
      channel: "email",
      send: async () => ({ status: "sent", providerMessageId: "email-1" })
    };
    const log = new InMemoryNotificationLog();
    const service = new NotificationService([adapter], log);

    const result = await service.send({
      businessId: "biz-1",
      appointmentId: "apt-1",
      channel: "email",
      templateKey: "booking.confirmed",
      recipient: "ana@example.com",
      payload: { customerName: "Ana" }
    });

    expect(result).toEqual({ status: "sent", providerMessageId: "email-1" });
    expect(log.records).toMatchObject([
      {
        channel: "email",
        templateKey: "booking.confirmed",
        status: "sent"
      }
    ]);
  });

  it("can register a future WhatsApp adapter without changing the service interface", async () => {
    const gateway = new FakeWhatsAppGateway();
    const adapter = new WhatsAppNotificationAdapter(gateway);
    const service = new NotificationService([adapter], new InMemoryNotificationLog());

    const result = await service.send({
      businessId: "biz-1",
      appointmentId: "apt-1",
      channel: "whatsapp",
      templateKey: "booking.confirmed",
      recipient: "+5493580000000",
      payload: { customerName: "Ana" }
    });

    expect(result.status).toBe("sent");
    expect(gateway.messages[0]).toMatchObject({
      to: "+5493580000000"
    });
  });

  it("supports booking.reminder through the WhatsApp adapter", async () => {
    const gateway = new FakeWhatsAppGateway();
    const log = new InMemoryNotificationLog();
    const service = new NotificationService([new WhatsAppNotificationAdapter(gateway)], log);

    await service.send({
      businessId: "biz-1",
      appointmentId: "apt-1",
      channel: "whatsapp",
      templateKey: "booking.reminder",
      recipient: "+5493580000000",
      payload: {
        customerName: "Ana",
        serviceName: "Manicure",
        startAt: "2026-06-02T09:00:00-03:00"
      }
    });

    expect(gateway.messages[0]?.message).toMatchObject({
      kind: "text",
      body: expect.stringContaining("te recordamos tu turno")
    });
    expect(log.records[0]).toMatchObject({
      channel: "whatsapp",
      templateKey: "booking.reminder",
      status: "sent"
    });
  });
});
