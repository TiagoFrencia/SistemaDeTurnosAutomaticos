"use client";

import React, { useState } from "react";
import type {
  AdminAvailabilityBlock,
  AdminBusinessHour,
  AdminProfessional
} from "@/lib/admin/admin-agenda-service";
import { AvailabilityBlockForm } from "@/components/admin/availability-block-form";

type Props = {
  businessSlug: string;
  professionals: AdminProfessional[];
  businessHours: AdminBusinessHour[];
  availabilityBlocks: AdminAvailabilityBlock[];
};

const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export function AdminAgendaPanel({ businessSlug, professionals, businessHours, availabilityBlocks }: Props) {
  const [hours, setHours] = useState(businessHours);
  const [blocks, setBlocks] = useState(availabilityBlocks);
  const [activeTab, setActiveTab] = useState<"hours" | "blocks">("hours");
  const [error, setError] = useState<string | null>(null);

  async function submitHours(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const data = new FormData(event.currentTarget);
    const professionalId = String(data.get("professionalId") ?? "");
    const response = await fetch(`/api/admin/business-hours?businessSlug=${businessSlug}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        professionalId: professionalId || null,
        hours: [
          {
            dayOfWeek: Number(data.get("dayOfWeek")),
            startTime: String(data.get("startTime")),
            endTime: String(data.get("endTime")),
            active: true
          }
        ]
      })
    });
    const body = await response.json();

    if (!response.ok) {
      setError(body.error ?? "No pudimos guardar los horarios.");
      return;
    }

    const targetProfessional = professionalId || null;
    setHours((current) => [
      ...current.filter((hour) => hour.professionalId !== targetProfessional),
      ...body
    ]);
  }

  return (
    <section className="admin-panel admin-agenda-panel" aria-labelledby="agenda-title">
      <div className="admin-panel-heading">
        <div>
          <p className="admin-kicker">Agenda</p>
          <h1 id="agenda-title">Horarios y bloqueos</h1>
          <p className="admin-help">
            Definí cuándo trabaja cada profesional y bloqueá horarios donde no se pueden tomar reservas.
          </p>
        </div>
      </div>

      <div className="admin-segmented-tabs" role="tablist" aria-label="Secciones de agenda">
        <button
          type="button"
          id="agenda-hours-tab"
          role="tab"
          aria-controls="agenda-hours-panel"
          aria-selected={activeTab === "hours"}
          onClick={() => setActiveTab("hours")}
        >
          Horarios
        </button>
        <button
          type="button"
          id="agenda-blocks-tab"
          role="tab"
          aria-controls="agenda-blocks-panel"
          aria-selected={activeTab === "blocks"}
          onClick={() => setActiveTab("blocks")}
        >
          Bloqueos
        </button>
      </div>

      {activeTab === "hours" ? (
        <div
          id="agenda-hours-panel"
          role="tabpanel"
          aria-labelledby="agenda-hours-tab"
          className="admin-tab-panel"
        >
          <div className="admin-list compact admin-hours-list">
            {hours.map((hour) => (
              <article className="admin-list-item admin-hour-row" key={hour.id}>
                <div>
                  <h2>{days[hour.dayOfWeek]}</h2>
                  <p>
                    {hour.startTime} a {hour.endTime}
                  </p>
                </div>
                <span className="admin-status active">
                  {professionals.find((professional) => professional.id === hour.professionalId)?.name ?? "General"}
                </span>
              </article>
            ))}
          </div>

          <p className="admin-mobile-note">Sábados y domingos no tienen turnos asignados. Podés agregar un día tocando Editar.</p>

          <form className="admin-form admin-schedule-form" onSubmit={submitHours}>
            <p className="admin-card-eyebrow">Modificar horario</p>
            <div className="admin-form-grid">
              <label>
                Profesional
                <select name="professionalId" defaultValue="">
                  <option value="">Horario general</option>
                  {professionals.map((professional) => (
                    <option key={professional.id} value={professional.id}>
                      {professional.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Día
                <select name="dayOfWeek" defaultValue={1}>
                  {days.map((day, index) => (
                    <option key={day} value={index}>
                      {day}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Desde
                <input name="startTime" type="time" required defaultValue="09:00" />
              </label>
              <label>
                Hasta
                <input name="endTime" type="time" required defaultValue="18:00" />
              </label>
            </div>
            {error ? <p className="admin-error">{error}</p> : null}
            <button className="admin-primary-button">Guardar horario</button>
          </form>
        </div>
      ) : (
        <div
          id="agenda-blocks-panel"
          role="tabpanel"
          aria-labelledby="agenda-blocks-tab"
          className="admin-subsection admin-tab-panel"
        >
          <h2>Bloqueos</h2>
          <p className="admin-help">
            Usalos para feriados, descansos, turnos personales o cualquier rango que no deba aparecer online.
          </p>
          <AvailabilityBlockForm
            businessSlug={businessSlug}
            professionals={professionals}
            onCreated={(block) => setBlocks((current) => [block, ...current])}
          />
          <div className="admin-list compact">
            {blocks.map((block) => (
              <article className="admin-list-item" key={block.id}>
                <div>
                  <h2>{block.reason || "Bloqueo"}</h2>
                  <p>
                    {block.startAt} a {block.endAt}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
