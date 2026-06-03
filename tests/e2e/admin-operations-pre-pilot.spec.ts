import { expect, test } from "@playwright/test";
import {
  cleanupE2ECustomer,
  customerFor,
  firstActiveAgendaItems,
  futureLocalDateTime,
  loginAdmin
} from "@/tests/e2e/helpers";

test.describe("admin pre-pilot operations", () => {
  test.setTimeout(120_000);
  test.beforeEach(async ({}, testInfo) => {
    await cleanupE2ECustomer(customerFor(testInfo, "admin-manual"));
    await cleanupE2ECustomer(customerFor(testInfo, "admin-cash"));
  });

  test.afterEach(async ({}, testInfo) => {
    await cleanupE2ECustomer(customerFor(testInfo, "admin-manual"));
    await cleanupE2ECustomer(customerFor(testInfo, "admin-cash"));
  });

  test("creates manual appointments and updates attendance from the admin UI", async ({ page }, testInfo) => {
    const agenda = await firstActiveAgendaItems();
    const manualCustomer = customerFor(testInfo, "admin-manual");
    const cashCustomer = customerFor(testInfo, "admin-cash");

    let adminPage = page;
    await loginAdmin(adminPage);
    await adminPage.goto("/admin/turnos");

    await createManualAppointment(adminPage, {
      customer: manualCustomer,
      serviceIds: agenda.serviceIds,
      professionalId: agenda.professionalId,
      startAt: futureLocalDateTime(20, testInfo.project.name === "mobile-chrome" ? 7 : 3),
      depositMode: "none"
    });

    adminPage = await page.context().newPage();
    await adminPage.goto(`/admin/turnos?clientName=${encodeURIComponent(manualCustomer.fullName)}`, {
      waitUntil: "domcontentloaded"
    });
    const manualCard = adminPage.locator("article").filter({ hasText: manualCustomer.fullName }).first();
    await expect(manualCard).toBeVisible();
    await manualCard.getByRole("button", { name: "Ver detalle" }).click();
    await expect(adminPage.getByText(/Saldo restante/i)).toBeVisible();
    await adminPage.getByRole("button", { name: /^Asistio$|^Asistió$/i }).click();
    await expect(adminPage.getByText(/Estado: attended/i)).toBeVisible();

    await createManualAppointmentViaApi(adminPage, {
      customer: cashCustomer,
      serviceIds: agenda.serviceIds.slice(0, 1),
      professionalId: agenda.professionalId,
      startAt: futureLocalDateTime(21, testInfo.project.name === "mobile-chrome" ? 11 : 5),
      depositMode: "cash"
    });

    adminPage = await page.context().newPage();
    await adminPage.goto(`/admin/turnos?clientName=${encodeURIComponent(cashCustomer.fullName)}`, {
      waitUntil: "domcontentloaded"
    });
    await expect(adminPage.getByText(cashCustomer.fullName).first()).toBeVisible();
    await expect(adminPage.getByText(/Sena: \$|Seña: \$/i).first()).toBeVisible();
  });
});

async function createManualAppointment(
  page: import("@playwright/test").Page,
  input: {
    customer: { fullName: string; phone: string; email: string };
    serviceIds: string[];
    professionalId: string;
    startAt: string;
    depositMode: "none" | "cash";
  }
) {
  const form = page.locator("form", { hasText: "Crear turno manual" }).last();
  await expect(form).toBeVisible();

  for (const serviceId of input.serviceIds) {
    await form.locator(`input[name="serviceIds"][value="${serviceId}"]`).check({ force: true });
  }

  await form.locator('select[name="professionalId"]').selectOption(input.professionalId);
  await form.locator('input[name="startAt"]').fill(input.startAt);
  await form.locator('input[name="fullName"]').fill(input.customer.fullName);
  await form.locator('input[name="phone"]').fill(input.customer.phone);
  await form.locator('input[name="email"]').fill(input.customer.email);
  await form.locator(`input[name="depositMode"][value="${input.depositMode}"]`).check({ force: true });

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/admin/appointments/manual") &&
      response.request().method() === "POST",
    { timeout: 30_000 }
  );
  await form.getByRole("button", { name: "Crear turno manual" }).evaluate((button) => {
    (button as HTMLButtonElement).click();
  });
  const response = await responsePromise;
  const body = await response.json().catch(() => ({}));
  expect(response.ok(), `Manual appointment API error: ${JSON.stringify(body)}`).toBe(true);
}

async function createManualAppointmentViaApi(
  page: import("@playwright/test").Page,
  input: {
    customer: { fullName: string; phone: string; email: string };
    serviceIds: string[];
    professionalId: string;
    startAt: string;
    depositMode: "none" | "cash";
  }
) {
  const response = await page.request.post("/api/admin/appointments/manual", {
    headers: {
      authorization: `Bearer ${process.env.ADMIN_API_KEY || "e2e-admin-key"}`
    },
    data: {
      businessSlug: "achul-nails",
      serviceIds: input.serviceIds,
      professionalId: input.professionalId,
      startAt: `${input.startAt}:00-03:00`,
      depositMode: input.depositMode,
      customer: input.customer
    }
  });
  const body = await response.json().catch(() => ({}));
  expect(response.ok(), `Manual cash appointment API error: ${JSON.stringify(body)}`).toBe(true);
}

async function filterByCustomer(page: import("@playwright/test").Page, fullName: string) {
  await page.getByLabel("Cliente (nombre)").fill(fullName);
  await page.getByRole("button", { name: "Filtrar" }).click();
  await page.waitForLoadState("networkidle");
}
