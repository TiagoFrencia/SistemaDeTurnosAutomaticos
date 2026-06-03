import { expect, test, type APIRequestContext, type TestInfo } from "@playwright/test";
import {
  cleanupE2ECustomer,
  cleanupE2EWhatsAppPhone,
  customerFor,
  loginAdmin
} from "@/tests/e2e/helpers";

test.describe("WhatsApp pre-pilot flow", () => {
  test.beforeEach(async ({}, testInfo) => cleanup(testInfo));
  test.afterEach(async ({}, testInfo) => cleanup(testInfo));

  test("processes a guided booking and shows the conversation in admin", async ({ request, page }, testInfo) => {
    const customer = customerFor(testInfo, "whatsapp");
    const from = customer.phone.replace(/^\+/, "");
    const idPrefix = `e2e-${testInfo.project.name}-${Date.now()}`;

    await sendInbound(request, `${idPrefix}-hello`, from, "hola");
    const duplicate = await sendInbound(request, `${idPrefix}-hello`, from, "hola");
    expect(duplicate.processed).toBe(0);

    await sendInbound(request, `${idPrefix}-services`, from, "1");
    await sendInbound(request, `${idPrefix}-professional`, from, "1");
    await sendInbound(request, `${idPrefix}-day`, from, "1");
    await sendInbound(request, `${idPrefix}-slot`, from, "1");
    await sendInbound(request, `${idPrefix}-name`, from, customer.fullName);
    await sendInbound(request, `${idPrefix}-email`, from, customer.email);
    await sendInbound(request, `${idPrefix}-confirm`, from, "1");

    await loginAdmin(page);
    await page.goto("/admin/whatsapp");
    await expect(page.getByText(from).first()).toBeVisible();
    await expect(page.getByText(/Completado|Reserva enviada|Inicio|Confirmando/i).first()).toBeVisible();

    await page.goto(`/admin/turnos?clientName=${encodeURIComponent(customer.fullName)}`);
    await expect(page.getByText(customer.fullName)).toBeVisible();
    await expect(page.getByText(/Estado: (pending_payment|confirmed)/i).first()).toBeVisible();
  });
});

async function cleanup(testInfo: TestInfo) {
  const customer = customerFor(testInfo, "whatsapp");
  await cleanupE2ECustomer(customer);
  await cleanupE2EWhatsAppPhone(customer.phone);
}

async function sendInbound(request: APIRequestContext, id: string, from: string, text: string) {
  const response = await request.post("/api/whatsapp/webhook", {
    data: {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "e2e-entry",
          changes: [
            {
              field: "messages",
              value: {
                messaging_product: "whatsapp",
                messages: [
                  {
                    from,
                    id,
                    timestamp: String(Math.floor(Date.now() / 1000)),
                    text: { body: text },
                    type: "text"
                  }
                ]
              }
            }
          ]
        }
      ]
    }
  });

  expect(response.ok()).toBe(true);
  return (await response.json()) as { ok: boolean; processed: number };
}
