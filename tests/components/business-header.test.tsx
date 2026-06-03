/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BusinessHeader } from "@/components/booking/business-header";

const business = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Achul_Nails",
  slug: "achul-nails",
  address: "Direccion a confirmar",
  branding: {
    primaryColor: "#24594c",
    themePreset: "editorial_green" as const,
    heroText: "Turnos confirmados para que tu horario quede cuidado desde el primer clic.",
    visualMode: "default" as const,
    logoUrl: null
  }
};

describe("BusinessHeader", () => {
  it("shows the business name when no logo is configured", () => {
    render(<BusinessHeader business={business} depositAmount={1500} durationMinutes={60} />);

    expect(screen.getByRole("heading", { name: "Achul_Nails" })).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Logo de Achul_Nails" })).not.toBeInTheDocument();
  });

  it("shows the logo when branding has a logo URL", () => {
    render(
      <BusinessHeader
        business={{
          ...business,
          branding: { ...business.branding, logoUrl: "https://example.com/logo.png" }
        }}
        depositAmount={1500}
        durationMinutes={60}
      />
    );

    expect(document.querySelector(".business-logo")).toHaveAttribute(
      "src",
      "https://example.com/logo.png"
    );
    expect(screen.getByRole("heading", { name: "Achul_Nails" })).toBeInTheDocument();
  });
});
