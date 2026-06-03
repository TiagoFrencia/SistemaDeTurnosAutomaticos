"use client";

import React, { useState } from "react";
import { CalendarDays } from "lucide-react";
import { AppointmentDetail } from "@/components/admin/appointment-detail";

type Appointment = {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  total_amount: number;
  deposit_amount: number;
  remaining_amount: number;
  notes?: string | null;
  customers?: Relation<{ full_name?: string | null; phone?: string | null; email?: string | null }>;
  professionals?: Relation<{ name?: string | null }>;
  services?: Relation<{ name?: string | null }>;
  appointment_services?: Array<{ position?: number | null; services?: Relation<{ name?: string | null }> }> | null;
};

type Relation<T> = T | T[] | null;

export default function AdminTurnosList({ appointments }: { appointments: Appointment[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!appointments || appointments.length === 0) {
    return <div className="admin-list">No hay turnos que mostrar.</div>;
  }

  return (
    <div className="admin-list admin-appointments-list">
      {appointments.map((appointment) => {
        const customer = firstRelation(appointment.customers);
        const professional = firstRelation(appointment.professionals);
        const service = firstRelation(appointment.services);
        const serviceNames = appointmentServiceNames(appointment, service?.name);
        const isExpanded = expandedId === appointment.id;

        return (
          <article className="admin-list-item admin-appointment-card" key={appointment.id}>
            <div className="admin-appointment-main">
              <div className="admin-appointment-title-row">
                <h2>{serviceNames.join(" + ") || "Servicio"}</h2>
                <span className={`admin-status ${statusClass(appointment.status)}`}>{statusLabel(appointment.status)}</span>
              </div>
              <p className="admin-appointment-time">
                <CalendarDays size={14} aria-hidden="true" />
                {formatDateTimeRange(appointment.start_at, appointment.end_at)} · {professional?.name ?? "Sin profesional"}
              </p>
              <p className="admin-appointment-client">
                <strong>{customer?.full_name ?? "Cliente"}</strong>
                <span>
                  {customer?.phone ?? "-"} · {customer?.email ?? "-"}
                </span>
              </p>
              {appointment.notes ? <p className="muted">Notas: {appointment.notes}</p> : null}
              <div className="admin-appointment-money" aria-label="Importes del turno">
                <span>
                  Total <strong>{formatMoney(appointment.total_amount)}</strong>
                </span>
                <span>
                  Seña <strong>{formatMoney(appointment.deposit_amount)}</strong>
                </span>
                <span>
                  Resta <strong>{formatMoney(appointment.remaining_amount)}</strong>
                </span>
              </div>
              <button
                className="admin-button admin-detail-toggle"
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : appointment.id)}
              >
                {isExpanded ? "Ocultar detalle" : "Ver detalle"}
              </button>
            </div>

            {isExpanded ? (
              <AppointmentDetail
                appointment={{
                  id: appointment.id,
                  start_at: appointment.start_at,
                  end_at: appointment.end_at,
                  status: appointment.status,
                  total_amount: appointment.total_amount,
                  deposit_amount: appointment.deposit_amount,
                  remaining_amount: appointment.remaining_amount,
                  notes: appointment.notes,
                  customer: {
                    fullName: customer?.full_name,
                    phone: customer?.phone,
                    email: customer?.email
                  },
                  professional: { name: professional?.name },
                  services: serviceNames,
                  service: { name: serviceNames.join(" + ") || service?.name }
                }}
              />
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function appointmentServiceNames(appointment: Appointment, fallbackName?: string | null): string[] {
  const names = (appointment.appointment_services ?? [])
    .slice()
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((item) => firstRelation(item.services)?.name)
    .filter((name): name is string => Boolean(name));

  if (names.length > 0) {
    return names;
  }

  return fallbackName ? [fallbackName] : [];
}

function firstRelation<T>(relation: Relation<T> | undefined): T | undefined {
  if (Array.isArray(relation)) {
    return relation[0];
  }

  return relation ?? undefined;
}

function formatDateTimeRange(startValue: string, endValue: string) {
  const start = new Date(startValue);
  const end = new Date(endValue);
  const date = new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires"
  }).format(start);
  const startTime = new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Argentina/Buenos_Aires"
  }).format(start);
  const endTime = new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Argentina/Buenos_Aires"
  }).format(end);

  return `${date} · ${startTime}-${endTime}`;
}

function formatMoney(amount: number) {
  return `$${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(amount)}`;
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    pending_payment: "Pendiente",
    confirmed: "Confirmado",
    attended: "Asistió",
    no_show: "No asistió",
    cancelled: "Cancelado",
    payment_expired: "Vencido",
    payment_failed: "Falló pago"
  };

  return labels[status] ?? status;
}

function statusClass(status: string) {
  if (status === "confirmed" || status === "attended") return "active";
  if (status === "pending_payment") return "warning";
  return "danger-soft";
}
