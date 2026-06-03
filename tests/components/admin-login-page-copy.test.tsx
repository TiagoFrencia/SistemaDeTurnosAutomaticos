/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AdminLoginPage from "@/app/admin/login/page";

vi.mock("@/components/admin/admin-login-form", () => ({
  AdminLoginForm: () => <form aria-label="login-form" />
}));

describe("AdminLoginPage", () => {
  it("renders the refined admin login copy", () => {
    render(<AdminLoginPage />);

    expect(screen.getByRole("heading", { name: "Entrar al panel" })).toBeInTheDocument();
    expect(screen.getByText("Gestioná turnos, pagos y WhatsApp desde un solo lugar.")).toBeInTheDocument();
    expect(screen.getByText("Achul_Nails")).toBeInTheDocument();
  });
});
