/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/turnos",
  useRouter: () => ({
    refresh: vi.fn(),
    replace: vi.fn()
  })
}));

vi.mock("@/lib/supabase/browser", () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      signOut: vi.fn()
    }
  })
}));

describe("AdminSidebar", () => {
  it("renders the admin navigation in daily-use order", () => {
    render(<AdminSidebar logoUrl="https://example.com/logo.png" />);

    const nav = screen.getByRole("navigation", { name: "Navegación admin" });
    const links = within(nav).getAllByRole("link").map((link) => link.textContent);

    expect(links).toEqual([
      "Inicio",
      "Turnos",
      "WhatsApp",
      "Agenda",
      "Servicios",
      "Profesionales",
      "Personalización",
      "Cuenta",
      "Reserva pública"
    ]);
    expect(within(nav).getByRole("link", { name: "Turnos" })).toHaveAttribute("aria-current", "page");
  });

  it("renders the mobile bottom nav with the active route", () => {
    render(<AdminSidebar logoUrl={null} />);

    const mobileNav = screen.getByRole("navigation", { name: "Navegación admin mobile" });
    expect(within(mobileNav).getAllByRole("link").map((link) => link.textContent)).toEqual([
      "Inicio",
      "Turnos",
      "WhatsApp",
      "Agenda",
      "Config."
    ]);
    expect(within(mobileNav).getByRole("link", { name: "Turnos" })).toHaveAttribute("aria-current", "page");
  });
});
