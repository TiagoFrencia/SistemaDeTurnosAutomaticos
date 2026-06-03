import { describe, expect, it } from "vitest";
import {
  handleAppointmentStatusRequest,
  updateAppointmentStatus,
  type AppointmentStatusRepository
} from "@/lib/admin/appointment-status-service";

const business = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "achul-nails"
};

describe("admin appointment status flow", () => {
  it("rejects status updates without an admin token", async () => {
    const repository = new FakeAppointmentStatusRepository();

    const response = await handleAppointmentStatusRequest({
      request: statusRequest("attended"),
      appointmentId: "appointment-1",
      businessSlug: "achul-nails",
      repository,
      adminApiKey: "secret"
    });

    expect(response.status).toBe(401);
    expect(repository.appointments.get("appointment-1")?.status).toBe("confirmed");
  });

  it.each(["attended", "no_show", "cancelled"] as const)("changes confirmed appointments to %s", async (status) => {
    const repository = new FakeAppointmentStatusRepository();

    const appointment = await updateAppointmentStatus(repository, {
      appointmentId: "appointment-1",
      businessSlug: "achul-nails",
      status
    });

    expect(appointment.status).toBe(status);
    expect(repository.appointments.get("appointment-1")?.status).toBe(status);
  });

  it("rejects unsupported statuses", async () => {
    const repository = new FakeAppointmentStatusRepository();

    const response = await handleAppointmentStatusRequest({
      request: new Request("http://localhost/api/admin/appointments/appointment-1/status", {
        method: "PATCH",
        headers: { authorization: "Bearer secret" },
        body: JSON.stringify({ status: "pending_payment" })
      }),
      appointmentId: "appointment-1",
      businessSlug: "achul-nails",
      repository,
      adminApiKey: "secret"
    });

    expect(response.status).toBe(400);
    expect(repository.appointments.get("appointment-1")?.status).toBe("confirmed");
  });

  it.each(["pending_payment", "payment_failed"] as const)("rejects changing appointments from %s", async (currentStatus) => {
    const repository = new FakeAppointmentStatusRepository();
    repository.appointments.set("appointment-1", {
      id: "appointment-1",
      businessId: business.id,
      status: currentStatus,
      updatedAt: null
    });

    await expect(
      updateAppointmentStatus(repository, {
        appointmentId: "appointment-1",
        businessSlug: "achul-nails",
        status: "attended"
      })
    ).rejects.toMatchObject({ code: "invalid_transition" });
  });

  it("does not modify linked payments when status changes", async () => {
    const repository = new FakeAppointmentStatusRepository();

    await updateAppointmentStatus(repository, {
      appointmentId: "appointment-1",
      businessSlug: "achul-nails",
      status: "no_show"
    });

    expect(repository.payments).toEqual([{ appointmentId: "appointment-1", status: "approved", amount: 1500 }]);
  });
});

function statusRequest(status: string, token?: string) {
  return new Request("http://localhost/api/admin/appointments/appointment-1/status", {
    method: "PATCH",
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
    body: JSON.stringify({ status })
  });
}

class FakeAppointmentStatusRepository implements AppointmentStatusRepository {
  appointments = new Map<
    string,
    { id: string; businessId: string; status: string; updatedAt: string | null }
  >([
    [
      "appointment-1",
      {
        id: "appointment-1",
        businessId: business.id,
        status: "confirmed",
        updatedAt: null
      }
    ]
  ]);
  payments = [{ appointmentId: "appointment-1", status: "approved", amount: 1500 }];

  async findBusinessBySlug(slug: string) {
    return slug === business.slug ? business : null;
  }

  async findAppointment(input: { businessId: string; appointmentId: string }) {
    const appointment = this.appointments.get(input.appointmentId);
    return appointment && appointment.businessId === input.businessId ? appointment : null;
  }

  async updateStatus(input: { businessId: string; appointmentId: string; status: "attended" | "no_show" | "cancelled" }) {
    const appointment = this.appointments.get(input.appointmentId);
    if (!appointment || appointment.businessId !== input.businessId) {
      return null;
    }

    appointment.status = input.status;
    appointment.updatedAt = "2026-06-01T12:00:00.000Z";
    return appointment;
  }
}
