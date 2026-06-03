"use client";

import React, { useState } from "react";
import type { AdminProfessional } from "@/lib/admin/admin-agenda-service";

type Props = {
  businessSlug: string;
  professionals: AdminProfessional[];
};

export function AdminProfessionalsPanel({ businessSlug, professionals }: Props) {
  const [items, setItems] = useState(professionals);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setSaving(true);
    setError(null);
    const data = new FormData(form);
    const response = await fetch(`/api/admin/professionals?businessSlug=${businessSlug}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(data.get("name") ?? ""),
        bio: String(data.get("bio") ?? ""),
        active: true
      })
    });
    const body = await response.json();
    setSaving(false);

    if (!response.ok) {
      setError(body.error ?? "No pudimos guardar la profesional.");
      return;
    }

    setItems((current) => [...current, body]);
    form.reset();
  }

  async function toggleActive(professional: AdminProfessional) {
    const response = await fetch(
      `/api/admin/professionals/${professional.id}?businessSlug=${businessSlug}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !professional.active })
      }
    );
    const body = await response.json();
    if (!response.ok) {
      setError(body.error ?? "No pudimos actualizar la profesional.");
      return;
    }
    setItems((current) => current.map((item) => (item.id === body.id ? body : item)));
  }

  return (
    <section className="admin-panel" aria-labelledby="professionals-title">
      <div className="admin-panel-heading">
        <div>
          <p className="admin-kicker">Profesionales</p>
          <h1 id="professionals-title">Equipo de atencion</h1>
          <p className="admin-help">
            Agrega a cada persona que atiende turnos. Si alguien no esta disponible, podes pausarla sin borrarla.
          </p>
        </div>
      </div>

      <form className="admin-form" onSubmit={submit}>
        <label>
          Nombre de la profesional
          <input name="name" required placeholder="Luna" />
        </label>
        <label>
          Bio
          <textarea name="bio" rows={3} placeholder="Especialidad o nota interna" />
        </label>
        {error ? <p className="admin-error">{error}</p> : null}
        <button className="admin-primary-button" disabled={saving}>
          {saving ? "Guardando..." : "Guardar profesional"}
        </button>
      </form>

      <div className="admin-list">
        {items.map((professional) => (
          <article className="admin-list-item" key={professional.id}>
            <div>
              <h2>{professional.name}</h2>
              <p>{professional.bio || "Sin bio cargada"}</p>
            </div>
            <div className="admin-row-actions">
              <span className={professional.active ? "admin-status active" : "admin-status"}>
                {professional.active ? "Activa" : "Inactiva"}
              </span>
              <button type="button" onClick={() => toggleActive(professional)}>
                {professional.active ? `Desactivar ${professional.name}` : `Activar ${professional.name}`}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
