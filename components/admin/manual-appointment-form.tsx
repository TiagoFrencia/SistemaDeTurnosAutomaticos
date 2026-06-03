"use client";

import React, { useState } from "react";

type ServiceOption = {
  id: string;
  name: string;
  durationMinutes: number;
  priceAmount?: number;
  depositAmount?: number;
};

type ProfessionalOption = {
  id: string;
  name: string;
};

export function ManualAppointmentForm({
  businessSlug,
  services,
  professionals
}: {
  businessSlug: string;
  services: ServiceOption[];
  professionals: ProfessionalOption[];
}) {
  const formRef = React.useRef<HTMLFormElement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(services[0]?.id ? [services[0].id] : []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = formRef.current ?? e.currentTarget;
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    const data = new FormData(form);
    const startAt = toArgentinaOffset(String(data.get("startAt") ?? ""));
    const serviceIds = data.getAll("serviceIds").map(String).filter(Boolean);
    const payload = {
      businessSlug,
      serviceIds,
      professionalId: String(data.get("professionalId") ?? ""),
      startAt,
      depositMode: String(data.get("depositMode") ?? "none"),
      customer: {
        fullName: String(data.get("fullName") ?? ""),
        phone: String(data.get("phone") ?? ""),
        email: String(data.get("email") ?? "")
      },
      notes: String(data.get("notes") ?? "")
    };

    try {
      if (serviceIds.length === 0) {
        setError("Elegí al menos un servicio.");
        setSubmitting(false);
        return;
      }

      const token = readAdminToken();
      const res = await fetch("/api/admin/appointments/manual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(body?.error ?? "Error creando el turno");
        setSubmitting(false);
        return;
      }

      setSuccess("Turno creado correctamente");
      formRef.current?.reset();
      window.location.reload();
    } catch (err) {
      setError(String(err));
      setSubmitting(false);
    }
  }

  return (
    <div className="admin-subsection">
      <h2>Crear turno manual</h2>
      <p className="muted">Para efectivo en el local o reservas tomadas por la admin. Puede incluir varios servicios seguidos.</p>
      <form ref={formRef} className="admin-form" onSubmit={handleSubmit}>
        <div className="admin-form-grid">
          <fieldset className="admin-form-fieldset admin-form-fieldset-wide">
            <legend>Servicios</legend>
            {services.map((service) => (
              <label key={service.id}>
                <input
                  checked={selectedServiceIds.includes(service.id)}
                  name="serviceIds"
                  onChange={(event) => {
                    setSelectedServiceIds((current) =>
                      event.target.checked
                        ? [...current, service.id]
                        : current.filter((serviceId) => serviceId !== service.id)
                    );
                  }}
                  type="checkbox"
                  value={service.id}
                />
                {service.name} ({service.durationMinutes} min)
              </label>
            ))}
            <ManualServiceSummary services={services} selectedServiceIds={selectedServiceIds} />
          </fieldset>
          <label>
            Profesional
            <select name="professionalId" required defaultValue={professionals[0]?.id ?? ""}>
              <option value="" disabled>
                Seleccionar
              </option>
              {professionals.map((professional) => (
                <option key={professional.id} value={professional.id}>
                  {professional.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Inicio
            <input name="startAt" type="datetime-local" required />
          </label>
          <label>
            Nombre cliente
            <input name="fullName" required />
          </label>
          <label>
            Teléfono
            <input name="phone" required />
          </label>
          <label>
            Email
            <input name="email" type="email" />
          </label>
        </div>

        <fieldset className="admin-form-fieldset">
          <legend>Seña</legend>
          <label>
            <input name="depositMode" type="radio" value="none" defaultChecked />
            Sin seña
          </label>
          <label>
            <input name="depositMode" type="radio" value="cash" />
            Seña pagada en efectivo
          </label>
        </fieldset>

        <label>
          Notas
          <textarea name="notes" rows={3} />
        </label>

        {error ? <p className="admin-error">{error}</p> : null}
        {success ? <p className="admin-success">{success}</p> : null}
        <button className="admin-primary-button" disabled={submitting || services.length === 0 || professionals.length === 0}>
          {submitting ? "Creando..." : "Crear turno manual"}
        </button>
      </form>
    </div>
  );
}

function ManualServiceSummary({
  services,
  selectedServiceIds
}: {
  services: ServiceOption[];
  selectedServiceIds: string[];
}) {
  const selected = services.filter((service) => selectedServiceIds.includes(service.id));
  const duration = selected.reduce((sum, service) => sum + service.durationMinutes, 0);
  const total = selected.reduce((sum, service) => sum + (service.priceAmount ?? 0), 0);
  const deposit = selected.reduce((sum, service) => sum + (service.depositAmount ?? 0), 0);

  return (
    <p className="admin-inline-summary">
      {selected.length === 0
        ? "Elegí uno o más servicios."
        : `${selected.length} servicio${selected.length === 1 ? "" : "s"} · ${duration} min · Total ${formatMoney(total)} · Seña ${formatMoney(deposit)}`}
    </p>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  }).format(value);
}

function readAdminToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const fromStorage = localStorage.getItem("ADMIN_API_KEY");
  if (fromStorage) {
    return fromStorage;
  }

  const match = document.cookie.match(new RegExp("(?:^|; )admin_api_key=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

function toArgentinaOffset(value: string): string {
  if (!value) {
    return value;
  }

  return `${value.length === 16 ? `${value}:00` : value}-03:00`;
}
