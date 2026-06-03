import { expect, test } from "@playwright/test";
import { attachScreenshot, expectNoHorizontalOverflow, loginAdmin } from "@/tests/e2e/helpers";

const publicPages = [
  { path: "/achul-nails", title: /Armá tu turno|Arma tu turno/i }
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
