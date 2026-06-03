/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminProfessionalsPanel } from "@/components/admin/admin-professionals-panel";

describe("AdminProfessionalsPanel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates and deactivates a professional", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          id: "pro-2",
          businessId: "biz-1",
          name: "Luna",
          bio: "Nail art",
          active: true
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          id: "pro-2",
          businessId: "biz-1",
          name: "Luna",
          bio: "Nail art",
          active: false
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminProfessionalsPanel businessSlug="achul-nails" professionals={[]} />);

    fireEvent.change(screen.getByLabelText("Nombre de la profesional"), { target: { value: "Luna" } });
    fireEvent.change(screen.getByLabelText("Bio"), { target: { value: "Nail art" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar profesional" }));

    await screen.findByText("Luna");
    fireEvent.click(screen.getByRole("button", { name: "Desactivar Luna" }));

    await screen.findByText("Inactiva");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
