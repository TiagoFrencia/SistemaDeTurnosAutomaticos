import { beforeEach, describe, expect, it } from "vitest";
import {
  handleAdminBusinessHoursPost,
  handleAdminServicePatch,
  handleAdminServicesPost
} from "@/lib/admin/admin-route-handlers";
import { FakeAdminAgendaRepository } from "@/tests/helpers/fake-admin-agenda-repository";

describe("admin endpoint contracts", () => {
  beforeEach(() => {
    process.env.ADMIN_API_KEY = "secret";
  });

  it("creates a service with HTTP 201", async () => {
    const repository = new FakeAdminAgendaRepository();

    const response = await handleAdminServicesPost(
      jsonRequest("http://localhost/api/admin/services?businessSlug=achul-nails", {
        name: "Kapping gel",
        durationMinutes: 90,
        priceAmount: 8000,
        depositType: "fixed",
        depositValue: 2500
      }),
      repository
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      name: "Kapping gel",
      depositAmount: 2500,
      active: true
    });
  });

  it("updates a service with HTTP 200 and returns 404 for a service outside the business", async () => {
    const repository = new FakeAdminAgendaRepository();
    const createResponse = await handleAdminServicesPost(
      jsonRequest("http://localhost/api/admin/services?businessSlug=achul-nails", {
        name: "Manicure",
        durationMinutes: 60,
        priceAmount: 5000,
        depositType: "fixed",
        depositValue: 1500
      }),
      repository
    );
    const service = await createResponse.json();

    const updateResponse = await handleAdminServicePatch(
      jsonRequest("http://localhost/api/admin/services?businessSlug=achul-nails", {
        active: false
      }),
      repository,
      { serviceId: service.id }
    );
    const missingResponse = await handleAdminServicePatch(
      jsonRequest("http://localhost/api/admin/services?businessSlug=missing", {
        active: false
      }),
      repository,
      { serviceId: service.id }
    );

    expect(updateResponse.status).toBe(200);
    await expect(updateResponse.json()).resolves.toMatchObject({ id: service.id, active: false });
    expect(missingResponse.status).toBe(404);
  });

  it("replaces business hours and rejects invalid payloads", async () => {
    const repository = new FakeAdminAgendaRepository();

    const firstResponse = await handleAdminBusinessHoursPost(
      jsonRequest("http://localhost/api/admin/business-hours?businessSlug=achul-nails", {
        hours: [{ dayOfWeek: 1, startTime: "09:00", endTime: "12:00" }]
      }),
      repository
    );
    const secondResponse = await handleAdminBusinessHoursPost(
      jsonRequest("http://localhost/api/admin/business-hours?businessSlug=achul-nails", {
        hours: [{ dayOfWeek: 2, startTime: "10:00", endTime: "13:00" }]
      }),
      repository
    );
    const invalidResponse = await handleAdminBusinessHoursPost(
      jsonRequest("http://localhost/api/admin/business-hours?businessSlug=achul-nails", {
        hours: [{ dayOfWeek: 8, startTime: "18:00", endTime: "09:00" }]
      }),
      repository
    );

    expect(firstResponse.status).toBe(201);
    expect(secondResponse.status).toBe(201);
    await expect(secondResponse.json()).resolves.toEqual([
      expect.objectContaining({ dayOfWeek: 2, startTime: "10:00" })
    ]);
    expect(repository.businessHours).toHaveLength(1);
    expect(invalidResponse.status).toBe(400);
  });

  it("rejects cross-origin admin mutations when auth depends on cookies", async () => {
    const repository = new FakeAdminAgendaRepository();

    const response = await handleAdminServicesPost(
      jsonRequest(
        "http://localhost/api/admin/services?businessSlug=achul-nails",
        {
          name: "Cross origin",
          durationMinutes: 60,
          priceAmount: 5000,
          depositType: "fixed",
          depositValue: 1500
        },
        { origin: "https://evil.example", cookie: "admin_api_key=secret", authorization: null }
      ),
      repository
    );

    expect(response.status).toBe(401);
  });

  it("allows same-origin admin mutations with the local API-key cookie fallback", async () => {
    const repository = new FakeAdminAgendaRepository();

    const response = await handleAdminServicesPost(
      jsonRequest(
        "http://localhost/api/admin/services?businessSlug=achul-nails",
        {
          name: "Same origin",
          durationMinutes: 60,
          priceAmount: 5000,
          depositType: "fixed",
          depositValue: 1500
        },
        { origin: "http://localhost", cookie: "admin_api_key=secret", authorization: null }
      ),
      repository
    );

    expect(response.status).toBe(201);
  });
});

function jsonRequest(
  url: string,
  body: unknown,
  headers: { origin?: string; cookie?: string; authorization?: string | null } = {}
): Request {
  const requestHeaders = new Headers({ "Content-Type": "application/json" });
  if (headers.authorization !== null) {
    requestHeaders.set("authorization", headers.authorization ?? "Bearer secret");
  }
  if (headers.origin) {
    requestHeaders.set("origin", headers.origin);
  }
  if (headers.cookie) {
    requestHeaders.set("cookie", headers.cookie);
  }

  return new Request(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: requestHeaders
  });
}
