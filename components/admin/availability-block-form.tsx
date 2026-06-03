"use client";

import React, { useState } from "react";
import type { AdminAvailabilityBlock, AdminProfessional } from "@/lib/admin/admin-agenda-service";

type Props = {
  businessSlug: string;
  professionals: AdminProfessional[];
  onCreated?: (block: AdminAvailabilityBlock) => void;
};

export function AvailabilityBlockForm({ businessSlug, professionals, onCreated }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setSaving(true);
    setError(null);
    const data = new FormData(form);
    const professionalId = String(data.get("professionalId") ?? "");

    const response = await fetch(`/api/admin/availability-blocks?businessSlug=${businessSlug}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        professionalId: professionalId || null,
        startAt: toArgentinaOffset(String(data.get("startAt") ?? "")),
        endAt: toArgentinaOffset(String(data.get("endAt") ?? "")),
        reason: String(data.get("reason") ?? "")
      })
    });
    const body = await response.json();
    setSaving(false);

    if (!response.ok) {
      setError(body.error ?? "No pudimos crear el bloqueo.");
      return;
    }

    onCreated?.(body);
    form.reset();
  }

  return (
    <form className="admin-form" onSubmit={submit}>
      <div className="admin-form-grid">
        <label>
          Profesional
          <select name="professionalId" defaultValue="">
            <option value="">Todo el negocio</option>
            {professionals.map((professional) => (
              <option key={professional.id} value={professional.id}>
                {professional.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Inicio del bloqueo
          <input name="startAt" type="datetime-local" required />
        </label>
        <label>
          Fin del bloqueo
          <input name="endAt" type="datetime-local" required />
        </label>
        <label>
          Motivo
          <input name="reason" placeholder="Capacitacion" />
        </label>
      </div>
      {error ? <p className="admin-error">{error}</p> : null}
      <button className="admin-primary-button" disabled={saving}>
        {saving ? "Creando..." : "Crear bloqueo"}
      </button>
    </form>
  );
}

function toArgentinaOffset(value: string): string {
  return `${value}:00-03:00`;
}
