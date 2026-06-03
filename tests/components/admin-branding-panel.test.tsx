/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminBrandingPanel } from "@/components/admin/admin-branding-panel";

describe("AdminBrandingPanel", () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders defaults and saves branding with bearer token", async () => {
    localStorage.setItem("ADMIN_API_KEY", "secret");
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.headers).toMatchObject({
        Authorization: "Bearer secret"
      });
      expect(JSON.parse(String(init?.body))).toMatchObject({
        primaryColor: "#b64f34",
        themePreset: "soft_rose",
        heroText: "Reserva simple y cuidada para clientas del salon.",
        visualMode: "compact",
        logoUrl: "https://example.com/logo.png"
      });

      return jsonResponse({
        primaryColor: "#b64f34",
        themePreset: "soft_rose",
        heroText: "Reserva simple y cuidada para clientas del salon.",
        visualMode: "compact",
        logoUrl: "https://example.com/logo.png"
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <AdminBrandingPanel
        businessSlug="achul-nails"
        branding={{
          primaryColor: "#24594c",
          themePreset: "editorial_green",
          heroText: "Turnos confirmados para que tu horario quede cuidado desde el primer clic.",
          visualMode: "default",
          logoUrl: null
        }}
      />
    );

    fireEvent.change(screen.getByLabelText("Acento avanzado"), { target: { value: "#b64f34" } });
    fireEvent.change(screen.getByLabelText("Modo visual"), { target: { value: "compact" } });
    fireEvent.change(screen.getByLabelText("Texto de portada"), {
      target: { value: "Reserva simple y cuidada para clientas del salon." }
    });
    fireEvent.change(screen.getByLabelText("URL del logo"), {
      target: { value: "https://example.com/logo.png" }
    });
    fireEvent.click(screen.getByLabelText("Rosa suave"));
    fireEvent.click(screen.getByRole("button", { name: "Guardar apariencia" }));

    await screen.findByText("Personalización guardada.");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });

  it("shows clear guidance when the admin token is missing or invalid", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ error: "No autorizado" }, 401)));

    render(
      <AdminBrandingPanel
        businessSlug="achul-nails"
        branding={{
          primaryColor: "#24594c",
          themePreset: "editorial_green",
          heroText: "Turnos confirmados para que tu horario quede cuidado desde el primer clic.",
          visualMode: "default",
          logoUrl: null
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Guardar apariencia" }));

    expect(await screen.findByText("Guardá la clave admin y volvé a intentar.")).toBeInTheDocument();
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
