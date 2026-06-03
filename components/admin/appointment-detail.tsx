"use client";

import React, { useState } from "react";

export type AppointmentDetailModel = {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  total_amount: number;
  deposit_amount: number;
  remaining_amount: number;
  notes?: string | null;
  customer?: { fullName?: string | null; phone?: string | null; email?: string | null };
  professional?: { name?: string | null };
  service?: { name?: string | null };
  services?: string[];
};

type TargetStatus = "attended" | "no_show" | "cancelled";

export function AppointmentDetail({ appointment }: { appointment: AppointmentDetailModel }) {
  const [submittingStatus, setSubmittingStatus] = useState<TargetStatus | null>(null);
  const [submittingReschedule, setSubmittingReschedule] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function updateStatus(status: TargetStatus) {
    setSubmittingStatus(status);
    setError(null);

    const token = readAdminToken();
    try {
      const response = await fetch(`/api/admin/appointments/${appointment.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status })
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body?.error ?? "No se pudo actualizar el turno");
        setSubmittingStatus(null);
        return;
      }

      window.location.reload();
    } catch (err) {
      setError(String(err));
      setSubmittingStatus(null);
    }
  }

  async function reschedule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittingReschedule(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    const startAt = toArgentinaOffset(String(data.get("rescheduleStartAt") ?? ""));
    const token = readAdminToken();

    try {
      const response = await fetch(`/api/admin/appointments/${appointment.id}/reschedule`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ startAt })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body?.error ?? "No se pudo reprogramar el turno");
        setSubmittingReschedule(false);
        return;
      }

      window.location.reload();
    } catch (err) {
      setError(String(err));
      setSubmittingReschedule(false);
    }
  }

  return (
    <div className="admin-appointment-detail">
      <div>
        <h3>Detalle del turno</h3>
        <p>
          {new Date(appointment.start_at).toLocaleString()} - {new Date(appointment.end_at).toLocaleTimeString()}
        </p>
        <p>Estado: {appointment.status}</p>
        {appointment.notes ? <p>Notas: {appointment.notes}</p> : null}
      </div>

      <div className="admin-detail-grid">
        <div>
          <h4>Cliente</h4>
          <p>{appointment.customer?.fullName ?? "Cliente"}</p>
          <p>{appointment.customer?.phone ?? "-"}</p>
          <p>{appointment.customer?.email ?? "-"}</p>
        </div>
        <div>
          <h4>Turno</h4>
          {appointment.services?.length ? (
            <ul className="admin-detail-service-list">
              {appointment.services.map((service) => (
                <li key={service}>{service}</li>
              ))}
            </ul>
          ) : (
            <p>{appointment.service?.name ?? "Servicio"}</p>
          )}
          <p>{appointment.professional?.name ?? "Profesional"}</p>
        </div>
        <div>
          <h4>Cobro</h4>
          <p>Total: ${appointment.total_amount}</p>
          <p>Sena pagada: ${appointment.deposit_amount}</p>
          <p>Saldo restante: ${appointment.remaining_amount}</p>
        </div>
      </div>

      <div className="admin-action-row">
        <button
          className="admin-primary-button"
          type="button"
          disabled={appointment.status === "attended" || submittingStatus !== null}
          onClick={() => updateStatus("attended")}
        >
          {submittingStatus === "attended" ? "Guardando..." : "Asistio"}
        </button>
        <button
          className="admin-button"
          type="button"
          disabled={appointment.status === "no_show" || submittingStatus !== null}
          onClick={() => updateStatus("no_show")}
        >
          {submittingStatus === "no_show" ? "Guardando..." : "No asistio"}
        </button>
        <button
          className="admin-button"
          type="button"
          disabled={appointment.status === "cancelled" || submittingStatus !== null}
          onClick={() => updateStatus("cancelled")}
        >
          {submittingStatus === "cancelled" ? "Guardando..." : "Cancelar"}
        </button>
      </div>

      <form className="admin-reschedule-form" onSubmit={reschedule}>
        <label>
          Reprogramar a
          <input name="rescheduleStartAt" required type="datetime-local" />
        </label>
        <button className="admin-button" disabled={submittingReschedule} type="submit">
          {submittingReschedule ? "Reprogramando..." : "Reprogramar"}
        </button>
      </form>

      {error ? <p className="admin-error">{error}</p> : null}
    </div>
  );
}

function toArgentinaOffset(value: string): string {
  if (!value) return value;
  return `${value.length === 16 ? `${value}:00` : value}-03:00`;
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
