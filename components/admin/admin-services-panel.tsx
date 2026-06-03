"use client";

import React, { useState } from "react";
import type { AdminService } from "@/lib/admin/admin-agenda-service";

type Props = {
  businessSlug: string;
  services: AdminService[];
};

export function AdminServicesPanel({ businessSlug, services }: Props) {
  const [items, setItems] = useState(services);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [depositType, setDepositType] = useState<"fixed" | "percentage">("fixed");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setSaving(true);
    setError(null);
    const data = new FormData(form);

    const response = await fetch(`/api/admin/services?businessSlug=${businessSlug}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(data.get("name") ?? ""),
        description: String(data.get("description") ?? ""),
        durationMinutes: Number(data.get("durationMinutes")),
        priceAmount: Number(data.get("priceAmount")),
        depositType: String(data.get("depositType") ?? "fixed"),
        depositValue: Number(data.get("depositValue")),
        active: true
      })
    });

    const body = await response.json();
    setSaving(false);

    if (!response.ok) {
      setError(body.error ?? "No pudimos guardar el servicio.");
      return;
    }

    setItems((current) => [...current, body]);
    form.reset();
    setDepositType("fixed");
  }

  return (
    <section className="admin-panel" aria-labelledby="services-title">
      <div className="admin-panel-heading">
        <div>
          <p className="admin-kicker">Servicios</p>
          <h1 id="services-title">Catalogo de tratamientos</h1>
          <p className="admin-help">
            Carga cada tratamiento con su duracion, precio total y sena. Esto define lo que ve la clienta al reservar.
          </p>
        </div>
        <a href="/achul-nails" className="admin-link">
          Ver agenda publica
        </a>
      </div>

      <form className="admin-form" onSubmit={submit}>
        <label>
          Nombre del servicio
          <input name="name" required placeholder="Kapping gel" />
        </label>
        <label>
          Descripcion
          <textarea name="description" rows={3} placeholder="Detalle breve para el equipo" />
        </label>
        <div className="admin-form-grid">
          <label>
            Duracion
            <input name="durationMinutes" type="number" min={15} step={15} required defaultValue={60} />
          </label>
          <label>
            Precio
            <input name="priceAmount" type="number" min={0} required defaultValue={5000} />
          </label>
          <label>
            Tipo de seña
            <select
              name="depositType"
              value={depositType}
              onChange={(event) => setDepositType(event.target.value === "percentage" ? "percentage" : "fixed")}
            >
              <option value="fixed">Monto fijo</option>
              <option value="percentage">Porcentaje</option>
            </select>
          </label>
          <div className="admin-field">
            <label htmlFor="depositValue">
              {depositType === "percentage" ? "Porcentaje de seña" : "Monto de seña"}
            </label>
            <span className="input-affix">
              {depositType === "fixed" ? <span aria-hidden="true">$</span> : null}
              <input
                id="depositValue"
                key={depositType}
                name="depositValue"
                type="number"
                min={0}
                max={depositType === "percentage" ? 100 : undefined}
                required
                defaultValue={depositType === "percentage" ? 30 : 1500}
                placeholder={depositType === "percentage" ? "30" : "1500"}
              />
              {depositType === "percentage" ? <span aria-hidden="true">%</span> : null}
            </span>
            <small>
              {depositType === "percentage"
                ? "Ejemplo: 30 significa 30% del precio total."
                : "Monto exacto que se cobra como seña."}
            </small>
          </div>
        </div>
        {error ? <p className="admin-error">{error}</p> : null}
        <button className="admin-primary-button" disabled={saving}>
          {saving ? "Guardando..." : "Guardar servicio"}
        </button>
      </form>

      <div className="admin-list">
        {items.map((service) => (
          <article className="admin-list-item" key={service.id}>
            <div>
              <h2>{service.name}</h2>
              <p>
                {service.durationMinutes} min · {formatMoney(service.priceAmount)} · seña{" "}
                {formatMoney(service.depositAmount)}
              </p>
            </div>
            <span className={service.active ? "admin-status active" : "admin-status"}>
              {service.active ? "Activo" : "Inactivo"}
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}

function formatMoney(amount: number): string {
  return `$${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(amount)}`;
}
