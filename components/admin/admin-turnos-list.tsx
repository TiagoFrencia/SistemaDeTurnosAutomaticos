"use client";

import React, { useState } from "react";
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
    <div className="admin-list">
      {appointments.map((appointment) => {
        const customer = firstRelation(appointment.customers);
        const professional = firstRelation(appointment.professionals);
        const service = firstRelation(appointment.services);
        const serviceNames = appointmentServiceNames(appointment, service?.name);
        const isExpanded = expandedId === appointment.id;

        return (
          <article className="admin-list-item" key={appointment.id}>
            <div>
              <h2>{serviceNames.join(" + ") || "Servicio"}</h2>
              <p>
                {new Date(appointment.start_at).toLocaleString()} -{" "}
                {new Date(appointment.end_at).toLocaleTimeString()}
              </p>
              <p className="muted">Estado: {appointment.status}</p>
              {appointment.notes ? <p>Notas: {appointment.notes}</p> : null}
            </div>

            <div className="admin-list-meta">
              <p>
                <strong>{customer?.full_name ?? "Cliente"}</strong>
              </p>
              <p>{customer?.phone ?? "-"}</p>
              <p>{customer?.email ?? "-"}</p>
              <p>Prof: {professional?.name ?? "-"}</p>
              <p>
                Total: ${appointment.total_amount} | Sena: ${appointment.deposit_amount} | Restante: $
                {appointment.remaining_amount}
              </p>
              <button
                className="admin-button"
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
