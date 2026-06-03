"use client";

import React, { useMemo, useState } from "react";
import { CustomerForm, type CustomerFormFields, type SubmitState } from "@/components/booking/customer-form";
import { ServiceSelector } from "@/components/booking/service-selector";
import { SlotPicker } from "@/components/booking/slot-picker";
import { buildPublicAvailabilityWindow } from "@/lib/public/availability-window";
import type { PublicAvailabilityResponse } from "@/lib/public/public-availability-service";

export function PublicBookingForm({
  businessSlug,
  availability
}: {
  businessSlug: string;
  availability: PublicAvailabilityResponse;
}) {
  const [currentAvailability, setCurrentAvailability] = useState(availability);
  const [selectedSlot, setSelectedSlot] = useState(availability.slots[0]?.startAt ?? "");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedService = currentAvailability.service;
  const selectedServiceIds = currentAvailability.selectedServiceIds ?? [currentAvailability.selectedServiceId];
  const selectedProfessional = useMemo(
    () =>
      currentAvailability.professionals.find(
        (professional) => professional.id === currentAvailability.selectedProfessionalId
      ),
    [currentAvailability.professionals, currentAvailability.selectedProfessionalId]
  );

  async function refreshAvailability(serviceIds: string[], professionalId: string) {
    setError(null);
    setIsRefreshing(true);

    try {
      const availabilityWindow = buildPublicAvailabilityWindow();
      const url = new URL(`/api/public/businesses/${businessSlug}/availability`, globalThis.location.origin);
      url.searchParams.set("from", availabilityWindow.from);
      url.searchParams.set("to", availabilityWindow.to);
      for (const serviceId of serviceIds) {
        url.searchParams.append("serviceIds", serviceId);
      }
      url.searchParams.set("professionalId", professionalId);

      const response = await fetch(`${url.pathname}${url.search}`);
      const payload = (await response.json().catch(() => ({}))) as PublicAvailabilityResponse & {
        error?: string;
      };

      if (!response.ok) {
        setError(payload.error ?? "No pudimos actualizar la disponibilidad.");
        return;
      }

      setCurrentAvailability(payload);
      setSelectedSlot(payload.slots[0]?.startAt ?? "");
    } finally {
      setIsRefreshing(false);
    }
  }

  async function submitBooking(customer: CustomerFormFields) {
    setError(null);

    if (!selectedSlot) {
      setError("Elegí un horario para continuar.");
      return;
    }

    setSubmitState("submitting");

    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
        businessSlug,
        serviceIds: selectedServiceIds,
        professionalId: currentAvailability.selectedProfessionalId,
        startAt: selectedSlot,
        customer
      })
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      checkoutUrl?: string;
    };

    if (!response.ok || !payload.checkoutUrl) {
      setSubmitState("idle");
      setError(payload.error ?? "No pudimos iniciar la reserva. Probá de nuevo.");
      return;
    }

    setSubmitState("redirecting");
    window.location.href = payload.checkoutUrl;
  }

  return (
    <section className="booking-panel" aria-label="Reservar turno">
      <div className="panel-heading">
        <span className="section-number">01</span>
        <div>
          <h2>Armá tu turno</h2>
          <p>Elegí servicio, profesional y horario. El turno queda confirmado después de pagar la seña.</p>
        </div>
      </div>

      <ServiceSelector
        depositAmount={selectedService.depositAmount}
        durationMinutes={selectedService.durationMinutes}
        isRefreshing={isRefreshing}
        onProfessionalChange={(professionalId) =>
          refreshAvailability(selectedServiceIds, professionalId)
        }
        onServiceChange={(serviceIds) =>
          refreshAvailability(serviceIds, currentAvailability.selectedProfessionalId)
        }
        priceAmount={selectedService.priceAmount}
        professionals={currentAvailability.professionals}
        selectedProfessionalId={currentAvailability.selectedProfessionalId}
        selectedServiceIds={selectedServiceIds}
        selectedServiceName={selectedService.name}
        selectedProfessionalName={selectedProfessional?.name ?? "Profesional"}
        services={currentAvailability.services}
      />

      <SlotPicker
        isRefreshing={isRefreshing}
        onSelectSlot={setSelectedSlot}
        selectedSlot={selectedSlot}
        slots={currentAvailability.slots}
      />

      <CustomerForm
        disabled={!selectedSlot || isRefreshing}
        error={error}
        onSubmit={submitBooking}
        submitState={submitState}
      />
    </section>
  );
}
