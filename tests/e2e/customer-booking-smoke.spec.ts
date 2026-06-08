import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { cleanupE2ECustomer, customerFor, type E2ECustomer } from "@/tests/e2e/helpers";

test.describe("customer booking smoke", () => {
  test.beforeEach(async ({}, testInfo) => {
    await cleanupE2ECustomer(customerFor(testInfo, "smoke"));
  });

  test.afterEach(async ({}, testInfo) => {
    await cleanupE2ECustomer(customerFor(testInfo, "smoke"));
  });

  test("books, approves payment and appears in admin appointments", async ({ page, request, baseURL }, testInfo) => {
    const customer = customerFor(testInfo, "smoke");
    const selectedSlotLabel = await bookFirstAvailableSlot(page, customer);

    await expect(page).toHaveURL(/\/e2e\/checkout/);
    const appointmentId = await page.getByTestId("appointment-id").textContent();
    const providerPaymentId = await page.getByTestId("provider-payment-id").textContent();

    expect(appointmentId).toBeTruthy();
    expect(providerPaymentId).toBeTruthy();

    await approvePayment(request, appointmentId!, providerPaymentId!);

    await page.context().addCookies([
      {
        name: "admin_api_key",
        value: process.env.ADMIN_API_KEY || "e2e-admin-key",
        url: baseURL
      }
    ]);
    await page.goto("/admin/turnos");

    await expect(page.getByText(customer.fullName)).toBeVisible();
    await expect(page.getByText(/Confirmado|Estado: confirmed/i).first()).toBeVisible();

    await page.goto("/achul-nails");
    await expect(page.getByRole("button", { name: selectedSlotLabel })).toHaveCount(0);
  });
});

async function bookFirstAvailableSlot(page: Page, customer: E2ECustomer) {
  await page.goto("/achul-nails");

  const serviceChoices = page.locator(".service-choice");
  if ((await serviceChoices.count()) > 1) {
    await serviceChoices.nth(1).click();
    await expect(page.locator(".service-choice-list")).toHaveAttribute("aria-busy", "false");
  }

  await page.getByRole("button", { name: "Continuar" }).click();

  if ((await serviceChoices.count()) > 1) {
    await expect(page.locator(".selected-services-list li")).toHaveCount(2);
  }

  await page.getByRole("button", { name: "Continuar" }).click();
  const firstSlot = page.locator(".slot-grid button").first();
  await expect(firstSlot).toBeVisible();
  const selectedSlotLabel = (await firstSlot.textContent())?.replace(/\s+/g, " ").trim();
  expect(selectedSlotLabel).toBeTruthy();

  await firstSlot.click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Nombre completo").fill(customer.fullName);
  await page.getByLabel("WhatsApp").fill(customer.phone);
  await page.getByLabel("Email").fill(customer.email);
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Pagar sena con Mercado Pago" }).click();

  return selectedSlotLabel!;
}

async function approvePayment(request: APIRequestContext, appointmentId: string, providerPaymentId: string) {
  const response = await request.post("/api/mercado-pago/webhook", {
    data: {
      appointmentId,
      providerPaymentId,
      outcome: "approved"
    }
  });

  expect(response.ok()).toBe(true);
}
