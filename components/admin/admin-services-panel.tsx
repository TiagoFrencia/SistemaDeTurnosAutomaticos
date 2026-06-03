"use client";

import React, { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import type { AdminService } from "@/lib/admin/admin-agenda-service";

type Props = {
  businessSlug: string;
  services: AdminService[];
};

type ServiceFilter = "all" | "active" | "paused";

export function AdminServicesPanel({ businessSlug, services }: Props) {
  const [items, setItems] = useState(services);
  const [selectedId, setSelectedId] = useState(services[0]?.id ?? "");
  const [filter, setFilter] = useState<ServiceFilter>("all");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const visibleItems = useMemo(() => {
    if (filter === "active") return items.filter((service) => service.active);
    if (filter === "paused") return items.filter((service) => !service.active);
    return items;
  }, [filter, items]);
  const selectedService = useMemo(
    () => visibleItems.find((service) => service.id === selectedId) ?? visibleItems[0] ?? null,
    [selectedId, visibleItems]
  );
  const [depositType, setDepositType] = useState<"fixed" | "percentage">("fixed");

  async function createService(event: React.FormEvent<HTMLFormElement>) {
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
    setSelectedId(body.id);
    form.reset();
    setDepositType("fixed");
  }

  async function updateService(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedService) return;
    const form = event.currentTarget;
    setSaving(true);
    setError(null);
    const data = new FormData(form);

    const response = await fetch(`/api/admin/services/${selectedService.id}?businessSlug=${businessSlug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(data.get("name") ?? ""),
        durationMinutes: Number(data.get("durationMinutes")),
        priceAmount: Number(data.get("priceAmount")),
        depositType: "fixed",
        depositValue: Number(data.get("depositValue")),
        active: String(data.get("active") ?? "true") === "true"
      })
    });

    const body = await response.json();
    setSaving(false);

    if (!response.ok) {
      setError(body.error ?? "No pudimos actualizar el servicio.");
      return;
    }

    setItems((current) => current.map((service) => (service.id === body.id ? body : service)));
  }

  return (
    <section className="admin-panel admin-services-panel" aria-labelledby="services-title">
      <div className="admin-panel-heading">
        <div>
          <p className="admin-kicker">Servicios</p>
          <h1 id="services-title">Servicios</h1>
          <p className="admin-help">Configurá tratamientos, duración, precio y seña.</p>
        </div>
        <a href="/achul-nails" className="admin-link">
          Ver reserva pública
        </a>
      </div>

      <form className="admin-form admin-create-service-form" onSubmit={createService}>
        <button className="admin-primary-button" disabled={saving}>
          {saving ? "Guardando..." : "Agregar servicio"}
        </button>
        <label>
          Nombre del servicio
          <input name="name" required placeholder="Kapping gel" />
        </label>
        <label>
          Descripción
          <textarea name="description" rows={3} placeholder="Detalle breve para el equipo" />
        </label>
        <div className="admin-form-grid">
          <label>
            Duración
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
      </form>

      <div className="admin-mobile-chip-row" aria-label="Filtros rápidos de servicios">
        <button
          type="button"
          className={`admin-filter-chip${filter === "all" ? " active" : ""}`}
          onClick={() => setFilter("all")}
        >
          Todos
        </button>
        <button
          type="button"
          className={`admin-filter-chip${filter === "active" ? " active" : ""}`}
          onClick={() => setFilter("active")}
        >
          Activos
        </button>
        <button
          type="button"
          className={`admin-filter-chip${filter === "paused" ? " active" : ""}`}
          onClick={() => setFilter("paused")}
        >
          Pausados
        </button>
      </div>

      <p className="admin-mobile-section-count">{visibleItems.length} servicios</p>
      <div className="admin-list admin-services-list">
        {visibleItems.length === 0 ? <p className="admin-empty">No hay servicios para este filtro.</p> : null}
        {visibleItems.map((service) => (
          <button
            type="button"
            className={`admin-service-card${service.id === selectedService?.id ? " selected" : ""}`}
            key={service.id}
            onClick={() => setSelectedId(service.id)}
          >
            <span className="admin-service-icon" aria-hidden="true">
              <Sparkles size={16} />
            </span>
            <span>
              <strong>{service.name}</strong>
              <small>
                {service.durationMinutes} min · Total {formatMoney(service.priceAmount)} · Seña{" "}
                {formatMoney(service.depositAmount)}
              </small>
              <em className={service.active ? "admin-status active" : "admin-status"}>
                {service.active ? "Activo" : "Pausado"}
              </em>
            </span>
          </button>
        ))}
      </div>

      {selectedService ? (
        <form className="admin-form admin-edit-service-form" onSubmit={updateService}>
          <p className="admin-card-eyebrow">Editar servicio</p>
          <h2>{selectedService.name}</h2>
          <label>
            Nombre del servicio
            <input name="name" required defaultValue={selectedService.name} />
          </label>
          <div className="admin-form-grid">
            <label>
              Duración (min)
              <input name="durationMinutes" type="number" min={15} step={15} required defaultValue={selectedService.durationMinutes} />
            </label>
            <label>
              Precio total
              <input name="priceAmount" type="number" min={0} required defaultValue={selectedService.priceAmount} />
            </label>
            <label>
              Seña
              <input name="depositValue" type="number" min={0} required defaultValue={selectedService.depositAmount} />
            </label>
            <label>
              Estado
              <select name="active" defaultValue={String(selectedService.active)}>
                <option value="true">Activo</option>
                <option value="false">Pausado</option>
              </select>
            </label>
          </div>
          <div className="admin-row-actions">
            <button type="button">Eliminar</button>
            <button type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}

function formatMoney(amount: number): string {
  return `$${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(amount)}`;
}
