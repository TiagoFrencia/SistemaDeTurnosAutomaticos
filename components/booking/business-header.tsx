import React from "react";
import { Sparkles } from "lucide-react";
import type { PublicAvailabilityResponse } from "@/lib/public/public-availability-service";

type Props = {
  business: PublicAvailabilityResponse["business"];
  depositAmount: number;
  durationMinutes: number;
};

export function BusinessHeader({ business, depositAmount, durationMinutes }: Props) {
  return (
    <header className="business-header app-business-header">
      <div className="app-status-bar" aria-hidden="true">
        <span>9:41</span>
        <span className="app-menu-dots">•••</span>
      </div>

      <div className="app-business-lockup">
        <span className="business-logo-frame app-logo-frame">
          {business.branding.logoUrl ? (
            <>
              {/* The logo URL is admin-provided, so Next Image remote patterns cannot be known ahead of time. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={business.branding.logoUrl} alt="" className="business-logo" />
            </>
          ) : (
            <Sparkles size={18} strokeWidth={2.7} />
          )}
        </span>
        <div>
          <h1>{business.name}</h1>
          <p>{business.branding.heroText}</p>
        </div>
      </div>

      <div className="booking-meta app-booking-meta" aria-label="Datos del turno">
        <span>{business.address ?? "Direccion a confirmar"}</span>
        <span>Sena {formatMoney(depositAmount)}</span>
        <span>{durationMinutes} min</span>
      </div>
    </header>
  );
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  }).format(amount);
}
