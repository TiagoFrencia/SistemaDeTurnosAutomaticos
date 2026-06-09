import { expect, test, type Page } from "@playwright/test";
import { attachScreenshot, expectNoHorizontalOverflow, loginAdmin } from "@/tests/e2e/helpers";

const publicPages = [
  { path: "/achul-nails", title: /Achul_Nails/i }
];

const adminPages = [
  { path: "/admin", title: /Panel de hoy/i },
  { path: "/admin/turnos", title: /Turnos confirmados/i },
  { path: "/admin/whatsapp", title: /Operacion WhatsApp|Operación WhatsApp/i },
  { path: "/admin/agenda", title: /Horarios y bloqueos/i },
  { path: "/admin/servicios", title: /Catalogo de tratamientos|Catálogo de tratamientos/i },
  { path: "/admin/profesionales", title: /Equipo de atencion|Equipo de atención/i },
  { path: "/admin/personalizacion", title: /Apariencia del negocio/i },
  { path: "/admin/cuenta", title: /Acceso del panel/i }
];

test.describe("pre-pilot visual smoke", () => {
  test("renders public booking without overflow", async ({ page }, testInfo) => {
    for (const target of publicPages) {
      await page.goto(target.path);
      await expect(page.getByRole("heading", { name: target.title }).first()).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await attachScreenshot(page, testInfo, `${testInfo.project.name}-${target.path.replaceAll("/", "-")}`);
    }
  });

  test("keeps public booking actions visible across compact mobile viewports", async ({ page }, testInfo) => {
    const viewports = [
      { width: 360, height: 640 },
      { width: 360, height: 740 },
      { width: 390, height: 844 },
      { width: 412, height: 915 },
      { width: 320, height: 568 }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto("/achul-nails");
      await expect(page.getByRole("heading", { name: /Achul_Nails/i }).first()).toBeVisible();

      for (const step of [0, 1, 2, 3, 4]) {
        await page.locator(".booking-step").nth(step).click();
        await expect(page.locator(".app-step-actions")).toBeVisible();
        await expectBookingSurfaceUsesViewport(page, viewport.height);
        await expectNoHorizontalOverflow(page);
      }

      await attachScreenshot(page, testInfo, `public-booking-${viewport.width}x${viewport.height}`);
    }
  });

  test("renders admin screens without overflow", async ({ page }, testInfo) => {
    await loginAdmin(page);

    for (const target of adminPages) {
      await page.goto(target.path);
      await expect(page.getByRole("heading", { name: target.title }).first()).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await expect(page.getByText(/No autorizado|Unauthorized/i)).toHaveCount(0);
      await attachScreenshot(page, testInfo, `${testInfo.project.name}-${target.path.replaceAll("/", "-")}`);
    }
  });
});

async function expectBookingSurfaceUsesViewport(page: Page, viewportHeight: number) {
  const box = await page.locator(".booking-surface").boundingBox();
  expect(box, "booking surface should be rendered").toBeTruthy();
  expect(box!.y).toBeGreaterThanOrEqual(-1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewportHeight + 1);
  expect(box!.height).toBeGreaterThanOrEqual(viewportHeight - 36);
}
