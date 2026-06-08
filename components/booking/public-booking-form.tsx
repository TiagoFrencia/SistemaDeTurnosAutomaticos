"use client";

import React, { useMemo, useState } from "react";
import { Check, Info, LockKeyhole } from "lucide-react";
import { SlotPicker } from "@/components/booking/slot-picker";
import { buildPublicAvailabilityWindow } from "@/lib/public/availability-window";
import type { PublicAvailabilityResponse } from "@/lib/public/public-availability-service";

type CustomerFields = {
  fullName: string;
  phone: string;
  email: string;
};

type SubmitState = "idle" | "submitting" | "redirecting";
type BookingStep = 0 | 1 | 2 | 3 | 4;

const steps = ["Servicio", "Profesional", "Horario", "Tus datos", "Confirmar"] as const;

export function PublicBookingForm({
  businessSlug,
  availability
}: {
  businessSlug: string;
  availability: PublicAvailabilityResponse;
}) {
  const [currentAvailability, setCurrentAvailability] = useState(availability);
  const [selectedSlot, setSelectedSlot] = useState(availability.slots[0]?.startAt ?? "");
  const [customer, setCustomer] = useState<CustomerFields>({
    fullName: "",
    phone: "",
    email: ""
  });
  const [step, setStep] = useState<BookingStep>(0);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedService = currentAvailability.service;
  const selectedServiceIds = currentAvailability.selectedServiceIds ?? [currentAvailability.selectedServiceId];
  const selectedServices =
    currentAvailability.selectedServices?.length > 0
      ? currentAvailability.selectedServices
      : currentAvailability.services.filter((service) => selectedServiceIds.includes(service.id));
  const selectedProfessional = useMemo(
    () =>
      currentAvailability.professionals.find(
        (professional) => professional.id === currentAvailability.selectedProfessionalId
      ),
    [currentAvailability.professionals, currentAvailability.selectedProfessionalId]
  );
  const selectedSlotLabel = selectedSlot ? formatSummaryDateTime(selectedSlot) : "Sin horario";
  const customerComplete = customer.fullName.trim() && customer.phone.trim() && customer.email.trim();

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

  function toggleService(serviceId: string) {
    const isSelected = selectedServiceIds.includes(serviceId);
    if (isSelected && selectedServiceIds.length === 1) {
      return;
    }

    const nextServiceIds = isSelected
      ? selectedServiceIds.filter((selectedServiceId) => selectedServiceId !== serviceId)
      : [...selectedServiceIds, serviceId];

    void refreshAvailability(nextServiceIds, currentAvailability.selectedProfessionalId);
  }

  function updateCustomer(field: keyof CustomerFields, value: string) {
    setCustomer((current) => ({ ...current, [field]: value }));
  }

  function goNext() {
    setError(null);
    setStep((current) => Math.min(4, current + 1) as BookingStep);
  }

  function goBack() {
    setError(null);
    setStep((current) => Math.max(0, current - 1) as BookingStep);
  }

  async function submitBooking() {
    setError(null);

    if (!selectedSlot) {
      setStep(2);
      setError("Elegi un horario para continuar.");
      return;
    }

    if (!customerComplete) {
      setStep(3);
      setError("Completa tus datos para confirmar el turno.");
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
      setError(payload.error ?? "No pudimos iniciar la reserva. Proba de nuevo.");
      return;
    }

    setSubmitState("redirecting");
    window.location.href = payload.checkoutUrl;
  }

  const canContinue =
    step === 0 ||
    step === 1 ||
    (step === 2 && Boolean(selectedSlot)) ||
    (step === 3 && Boolean(customerComplete)) ||
    (step === 4 && Boolean(selectedSlot) && Boolean(customerComplete));

  return (
    <section className="booking-panel public-app-panel" aria-label="Reservar turno" data-step={step}>
      <StepNav activeStep={step} onSelectStep={(nextStep) => setStep(nextStep)} />

      <div className="public-step-content">
        {step === 0 ? (
          <section className="booking-section app-step-screen" aria-labelledby="service-section-title">
            <StepEyebrow id="service-section-title">Elegi un servicio</StepEyebrow>
            <div className="service-choice-list app-service-list" aria-busy={isRefreshing} aria-label="Servicios">
              {currentAvailability.services.map((service) => {
                const checked = selectedServiceIds.includes(service.id);
                return (
                  <label className="service-choice app-service-card" data-selected={checked ? "true" : undefined} key={service.id}>
                    <input
                      checked={checked}
                      disabled={isRefreshing || (checked && selectedServiceIds.length === 1)}
                      onChange={() => toggleService(service.id)}
                      type="checkbox"
                    />
                    <span>
                      <strong>{service.name}</strong>
                      <small>
                        {service.durationMinutes} min - Sena {formatMoney(service.depositAmount)} - Total{" "}
                        {formatMoney(service.priceAmount)}
                      </small>
                    </span>
                    <span className="service-check" aria-hidden="true">
                      {checked ? <Check size={16} strokeWidth={3} /> : null}
                    </span>
                  </label>
                );
              })}
            </div>
          </section>
        ) : null}

        {step === 1 ? (
          <section className="booking-section app-step-screen" aria-labelledby="professional-section-title">
            <StepEyebrow id="professional-section-title">Profesional</StepEyebrow>
            <label className="field app-select-field">
              <span>Profesional</span>
              <select
                aria-busy={isRefreshing}
                aria-label="Profesional"
                onChange={(event) => void refreshAvailability(selectedServiceIds, event.target.value)}
                value={currentAvailability.selectedProfessionalId}
              >
                {currentAvailability.professionals.map((professional) => (
                  <option key={professional.id} value={professional.id}>
                    {professional.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="professional-summary-card">
              <strong>{selectedService.name}</strong>
              <dl>
                <div>
                  <dt>Total</dt>
                  <dd>{formatMoney(selectedService.priceAmount)}</dd>
                </div>
                <div>
                  <dt>Sena</dt>
                  <dd>{formatMoney(selectedService.depositAmount)}</dd>
                </div>
                <div>
                  <dt>Dur.</dt>
                  <dd>{selectedService.durationMinutes} min</dd>
                </div>
              </dl>
              {selectedServices.length > 1 ? (
                <ul className="selected-services-list">
                  {selectedServices.map((service) => (
                    <li key={service.id}>{service.name}</li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className="booking-note app-payment-note" aria-live="polite">
              <Info size={16} />
              <p>
                El turno queda confirmado solo despues de pagar la sena. Si el pago expira o falla, el horario
                vuelve a estar disponible.
              </p>
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="booking-section app-step-screen" aria-labelledby="slot-section-title">
            <StepEyebrow id="slot-section-title">Elegi un dia</StepEyebrow>
            <SlotPicker
              isRefreshing={isRefreshing}
              onSelectSlot={setSelectedSlot}
              selectedSlot={selectedSlot}
              slots={currentAvailability.slots}
            />
          </section>
        ) : null}

        {step === 3 ? (
          <section className="booking-section app-step-screen" aria-labelledby="customer-section-title">
            <StepEyebrow id="customer-section-title">Tus datos</StepEyebrow>
            <div className="field-grid app-customer-grid">
              <label className="field app-dark-field app-field-wide">
                <span>Nombre completo</span>
                <input
                  autoComplete="name"
                  name="fullName"
                  onChange={(event) => updateCustomer("fullName", event.target.value)}
                  placeholder="Ana Perez"
                  required
                  value={customer.fullName}
                />
              </label>
              <label className="field app-dark-field">
                <span>WhatsApp</span>
                <input
                  autoComplete="tel"
                  name="phone"
                  onChange={(event) => updateCustomer("phone", event.target.value)}
                  placeholder="+54 9..."
                  required
                  value={customer.phone}
                />
              </label>
              <label className="field app-dark-field">
                <span>Email</span>
                <input
                  autoComplete="email"
                  name="email"
                  onChange={(event) => updateCustomer("email", event.target.value)}
                  placeholder="ana@mail.com"
                  required
                  type="email"
                  value={customer.email}
                />
              </label>
            </div>

            <div className="booking-note app-payment-note">
              <LockKeyhole size={16} />
              <p>Tus datos solo se usan para confirmar el turno. Te llegara la confirmacion por WhatsApp y email.</p>
            </div>
          </section>
        ) : null}

        {step === 4 ? (
          <section className="booking-section app-step-screen" aria-labelledby="summary-section-title">
            <StepEyebrow id="summary-section-title">Resumen del turno</StepEyebrow>
            <div className="booking-summary-card">
              <SummaryRow label="Servicio" value={selectedService.name} />
              <SummaryRow label="Profesional" value={selectedProfessional?.name ?? "Profesional"} />
              <SummaryRow label="Fecha y hora" value={selectedSlotLabel} />
              <SummaryRow label="Duracion" value={`${selectedService.durationMinutes} min`} />
              <SummaryRow label="Direccion" value={currentAvailability.business.address ?? "A confirmar por WhatsApp"} />
            </div>
            <div className="booking-summary-card">
              <SummaryRow label="Total del servicio" value={formatMoney(selectedService.priceAmount)} />
              <SummaryRow label="Sena a pagar ahora" value={formatMoney(selectedService.depositAmount)} />
              <SummaryRow
                label="Resta en el local"
                value={formatMoney(Math.max(0, selectedService.priceAmount - selectedService.depositAmount))}
              />
            </div>
            <p className="fine-print app-summary-copy">
              El turno se confirma cuando Mercado Pago aprueba el pago de la sena. Si el pago expira o falla, el
              horario vuelve a estar disponible.
            </p>
          </section>
        ) : null}
      </div>

      {error ? (
        <p className="form-error app-form-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="app-step-actions">
        <button className="secondary-button app-nav-button" disabled={step === 0 || submitState !== "idle"} onClick={goBack} type="button">
          Volver
        </button>
        {step < 4 ? (
          <button
            className="primary-button app-nav-button"
            disabled={!canContinue || isRefreshing || submitState !== "idle"}
            onClick={goNext}
            type="button"
          >
            Continuar
          </button>
        ) : (
          <button
            className="primary-button app-pay-button"
            disabled={!canContinue || isRefreshing || submitState !== "idle"}
            onClick={() => void submitBooking()}
            type="button"
          >
            {submitState === "redirecting"
              ? "Redirigiendo a Mercado Pago"
              : submitState === "submitting"
                ? "Preparando sena"
                : "Pagar sena con Mercado Pago"}
          </button>
        )}
      </div>
    </section>
  );
}

function StepNav({
  activeStep,
  onSelectStep
}: {
  activeStep: BookingStep;
  onSelectStep: (step: BookingStep) => void;
}) {
  return (
    <nav className="booking-stepper" aria-label="Pasos de reserva">
      {steps.map((label, index) => (
        <button
          aria-current={activeStep === index ? "step" : undefined}
          className="booking-step"
          data-active={activeStep === index ? "true" : undefined}
          key={label}
          onClick={() => onSelectStep(index as BookingStep)}
          type="button"
        >
          <span>{index + 1}</span>
          <small>{label}</small>
        </button>
      ))}
    </nav>
  );
}

function StepEyebrow({ children, id }: { children: React.ReactNode; id: string }) {
  return (
    <div className="section-label app-step-label">
      <h3 id={id}>{children}</h3>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <dl className="summary-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </dl>
  );
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  }).format(amount);
}

function formatSummaryDateTime(value: string): string {
  const date = new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "long"
  })
    .format(new Date(value))
    .replace(".", "");
  const time = new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(value));

  return `${date} - ${time}`;
}
