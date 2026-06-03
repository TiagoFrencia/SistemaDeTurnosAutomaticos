/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminAccountForm } from "@/components/admin/admin-account-form";

const updateUser = vi.fn();

vi.mock("@/lib/supabase/browser", () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      updateUser
    }
  })
}));

describe("AdminAccountForm", () => {
  beforeEach(() => {
    updateUser.mockReset();
    updateUser.mockResolvedValue({ error: null });
  });

  it("updates the admin email", async () => {
    render(<AdminAccountForm currentEmail="viejo@example.com" />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "nuevo@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Cambiar email" }));

    await waitFor(() => expect(updateUser).toHaveBeenCalledWith({ email: "nuevo@example.com" }));
    expect(await screen.findByText(/Cambio de email iniciado/)).toBeInTheDocument();
  });

  it("updates the password only when both values match", async () => {
    render(<AdminAccountForm currentEmail="admin@example.com" />);

    fireEvent.change(screen.getByLabelText("Nueva contraseña"), { target: { value: "ClaveNueva123" } });
    fireEvent.change(screen.getByLabelText("Repetir contraseña"), { target: { value: "ClaveNueva123" } });
    fireEvent.click(screen.getByRole("button", { name: "Cambiar contraseña" }));

    await waitFor(() => expect(updateUser).toHaveBeenCalledWith({ password: "ClaveNueva123" }));
    expect(await screen.findByText("Contraseña actualizada.")).toBeInTheDocument();
  });

  it("rejects mismatched passwords before calling Supabase", async () => {
    render(<AdminAccountForm currentEmail="admin@example.com" />);

    fireEvent.change(screen.getByLabelText("Nueva contraseña"), { target: { value: "ClaveNueva123" } });
    fireEvent.change(screen.getByLabelText("Repetir contraseña"), { target: { value: "OtraClave123" } });
    fireEvent.click(screen.getByRole("button", { name: "Cambiar contraseña" }));

    expect(await screen.findByText("Las contraseñas no coinciden.")).toBeInTheDocument();
    expect(updateUser).not.toHaveBeenCalled();
  });
});
