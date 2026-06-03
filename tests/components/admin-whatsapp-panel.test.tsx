/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminWhatsAppPanel } from "@/components/admin/admin-whatsapp-panel";
import type { AdminWhatsAppConversation } from "@/lib/admin/whatsapp-operations-service";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh })
}));

describe("AdminWhatsAppPanel", () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    refresh.mockClear();
  });

  it("shows conversation summary and expandable context", () => {
    render(<AdminWhatsAppPanel conversations={[conversation()]} />);

    expect(screen.getByText("+5491111111111")).toBeInTheDocument();
    expect(screen.getByText("Confirmando resumen")).toBeInTheDocument();
    expect(screen.getByText(/Último mensaje:/)).toBeInTheDocument();
    expect(screen.getByText(/Mensajes procesados:/)).toBeInTheDocument();
    expect(screen.getByText(/Esperando que confirme y pague/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ver detalle" }));

    expect(screen.getByText("Detalle operativo")).toBeInTheDocument();
    expect(screen.getByText("Manicure semipermanente, kapping gel")).toBeInTheDocument();
    expect(screen.getByText("Azul")).toBeInTheDocument();
    expect(screen.getByText("miércoles, 3 de junio")).toBeInTheDocument();
    expect(screen.getByText("10:00")).toBeInTheDocument();
    expect(screen.getByText("Ana Perez")).toBeInTheDocument();
    expect(screen.getAllByText("ana@example.com").length).toBeGreaterThan(0);
  });

  it("resets a conversation with bearer token and refreshes", async () => {
    localStorage.setItem("ADMIN_API_KEY", "secret");
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(_input)).toBe("/api/admin/whatsapp/conversations/reset");
      expect(init?.method).toBe("POST");
      expect(init?.headers).toMatchObject({ Authorization: "Bearer secret" });
      expect(JSON.parse(String(init?.body))).toEqual({ phone: "+5491111111111" });
      return jsonResponse({ phone: "+5491111111111", state: "greeting" });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminWhatsAppPanel conversations={[conversation()]} />);

    fireEvent.click(screen.getByRole("button", { name: "Reiniciar" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});

function conversation(): AdminWhatsAppConversation {
  return {
    id: "conversation-1",
    businessId: "business-1",
    phone: "+5491111111111",
    state: "confirming_booking",
    stateLabel: "Confirmando resumen",
    suggestedAction: "Esperando que confirme y pague.",
    context: {
      serviceIds: ["service-1"],
      professionalId: "professional-1",
      selectedDate: "2026-06-03",
      startAt: "2026-06-03T13:00:00.000Z",
      fullName: "Ana Perez",
      email: "ana@example.com",
      dayPage: 0,
      slotPage: 0
    },
    displayContext: {
      serviceNames: ["Manicure semipermanente", "kapping gel"],
      professionalName: "Azul",
      selectedDayLabel: "miércoles, 3 de junio",
      selectedTimeLabel: "10:00",
      fullName: "Ana Perez",
      email: "ana@example.com"
    },
    lastMessage: "ana@example.com",
    expiresAt: "2026-06-02T20:00:00.000Z",
    createdAt: "2026-06-02T10:00:00.000Z",
    updatedAt: "2026-06-02T11:00:00.000Z",
    processedMessagesCount: 4,
    isExpired: false
  };
}

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}
