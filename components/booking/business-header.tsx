import React from "react";
import type { PublicAvailabilityResponse } from "@/lib/public/public-availability-service";

type Props = {
  business: PublicAvailabilityResponse["business"];
  depositAmount: number;
  durationMinutes: number;
};

export function BusinessHeader({ business, depositAmount, durationMinutes }: Props) {
  return (
    <header className="business-header">
      <div className="booking-kicker">Agenda con seña</div>
      <div className="business-lockup">
        {business.branding.logoUrl ? (
          <span className="business-logo-frame">
            {/* The logo URL is admin-provided, so Next Image remote patterns cannot be known ahead of time. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={business.branding.logoUrl} alt="" className="business-logo" />
          </span>
        ) : null}
        <h1>{business.name}</h1>
      </div>
      <p>{business.branding.heroText}</p>
      <div className="booking-meta" aria-label="Datos del turno">
        {business.address ? <span>{business.address}</span> : null}
        <span>Seña {formatMoney(depositAmount)}</span>
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
