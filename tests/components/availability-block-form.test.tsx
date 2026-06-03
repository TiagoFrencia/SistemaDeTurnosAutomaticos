/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AvailabilityBlockForm } from "@/components/admin/availability-block-form";

describe("AvailabilityBlockForm", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates an availability block for the selected professional", async () => {
    const onCreated = vi.fn();
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(JSON.parse(String(init?.body))).toMatchObject({
        professionalId: "pro-1",
        startAt: "2026-06-03T09:00:00-03:00",
        endAt: "2026-06-03T10:00:00-03:00",
        reason: "Capacitacion"
      });

      return jsonResponse({
        id: "block-1",
        businessId: "biz-1",
        professionalId: "pro-1",
        startAt: "2026-06-03T09:00:00-03:00",
        endAt: "2026-06-03T10:00:00-03:00",
        reason: "Capacitacion"
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <AvailabilityBlockForm
        businessSlug="achul-nails"
        professionals={[{ id: "pro-1", businessId: "biz-1", name: "Azul", bio: null, active: true }]}
        onCreated={onCreated}
      />
    );

    fireEvent.change(screen.getByLabelText("Profesional"), { target: { value: "pro-1" } });
    fireEvent.change(screen.getByLabelText("Inicio del bloqueo"), { target: { value: "2026-06-03T09:00" } });
    fireEvent.change(screen.getByLabelText("Fin del bloqueo"), { target: { value: "2026-06-03T10:00" } });
    fireEvent.change(screen.getByLabelText("Motivo"), { target: { value: "Capacitacion" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear bloqueo" }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ id: "block-1" })));
  });
});

function jsonResponse(body: unknown, status = 201): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
