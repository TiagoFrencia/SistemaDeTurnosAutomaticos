import { expect, test } from "@playwright/test";

test.describe("pre-pilot security smoke", () => {
  test("protects admin pages without an authenticated session", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin/);
    await expect(page.getByRole("heading", { name: "Entrar al panel" })).toBeVisible();
  });

  test("rejects cron jobs without CRON_SECRET", async ({ request }) => {
    const expire = await request.get("/api/jobs/expire-pending-payments");
    const reminders = await request.get("/api/jobs/appointment-reminders");

    expect(expire.status()).toBe(401);
    expect(reminders.status()).toBe(401);
  });

  test("validates WhatsApp webhook verification tokens", async ({ request }) => {
    const wrong = await request.get(
      "/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong-token&hub.challenge=bad"
    );
    expect(wrong.status()).toBe(403);

    if (!process.env.META_WHATSAPP_VERIFY_TOKEN) {
      test.skip(true, "META_WHATSAPP_VERIFY_TOKEN is required for positive webhook verification");
    }

    const challenge = "pre-pilot-ok";
    const correct = await request.get(
      `/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(
        process.env.META_WHATSAPP_VERIFY_TOKEN!
      )}&hub.challenge=${challenge}`
    );

    expect(correct.status()).toBe(200);
    await expect(correct.text()).resolves.toBe(challenge);
  });
});
