"use client";

import React, { useState } from "react";
import { SlidersHorizontal } from "lucide-react";

type Professional = {
  id: string;
  name: string;
};

type SearchParams = {
  date?: string;
  status?: string;
  professionalId?: string;
  page?: string;
  clientName?: string;
};

type Props = {
  searchParams: SearchParams;
  professionals: Professional[];
  total: number;
  pageNumber: number;
  lastPage: number;
  today: string;
};

export function AdminTurnosFilters({ searchParams, professionals, total, pageNumber, lastPage, today }: Props) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const { date, status } = searchParams;
  const mobilePanelId = "turnos-mobile-advanced-filters";
  const chips = [
    { href: "/admin/turnos", label: "Todos", active: !date && !status },
    { href: `/admin/turnos?date=${today}`, label: "Hoy", active: date === today },
    { href: "/admin/turnos?status=pending_payment", label: "Pendientes", active: status === "pending_payment" },
    { href: "/admin/turnos?status=confirmed", label: "Confirmados", active: status === "confirmed" },
    { href: "/admin/turnos?status=payment_expired", label: "Vencidos", active: status === "payment_expired" }
  ];

  return (
    <div className="admin-turnos-filter-shell">
      <div className="admin-turnos-mobile-tools">
        <nav className="admin-mobile-chip-row" aria-label="Filtros rápidos de turnos">
          {chips.map((chip) => (
            <a className={`admin-filter-chip${chip.active ? " active" : ""}`} href={chip.href} key={chip.label}>
              {chip.label}
            </a>
          ))}
        </nav>
        <button
          aria-controls={mobilePanelId}
          aria-expanded={mobileFiltersOpen}
          aria-label="Abrir filtros avanzados"
          className="admin-mobile-filter-button"
          type="button"
          onClick={() => setMobileFiltersOpen((current) => !current)}
        >
          <SlidersHorizontal size={15} aria-hidden="true" />
        </button>
      </div>

      <AdvancedFiltersForm
        className="admin-form admin-turnos-advanced-form admin-turnos-desktop-form"
        searchParams={searchParams}
        professionals={professionals}
        total={total}
        pageNumber={pageNumber}
        lastPage={lastPage}
      />

      <div
        aria-hidden={!mobileFiltersOpen}
        className={`admin-turnos-mobile-panel${mobileFiltersOpen ? " is-open" : ""}`}
        id={mobilePanelId}
      >
        <AdvancedFiltersForm
          className="admin-form admin-turnos-advanced-form"
          searchParams={searchParams}
          professionals={professionals}
          total={total}
          pageNumber={pageNumber}
          lastPage={lastPage}
        />
      </div>
    </div>
  );
}

type AdvancedFiltersProps = Omit<Props, "today"> & {
  className: string;
};

function AdvancedFiltersForm({ className, searchParams, professionals, total, pageNumber, lastPage }: AdvancedFiltersProps) {
  const previousQuery = withPage(searchParams, Math.max(1, pageNumber - 1));
  const nextQuery = withPage(searchParams, Math.min(lastPage, pageNumber + 1));

  return (
    <form className={className} method="get">
      <div className="admin-form-grid">
        <label>
          Fecha
          <input name="date" type="date" defaultValue={searchParams.date} />
        </label>
        <label>
          Estado
          <select name="status" defaultValue={searchParams.status ?? ""}>
            <option value="">Todos</option>
            <option value="confirmed">Confirmado</option>
            <option value="attended">Asistió</option>
            <option value="no_show">No asistió</option>
            <option value="pending_payment">Pendiente</option>
            <option value="payment_expired">Vencido</option>
          </select>
        </label>
        <label>
          Profesional
          <select name="professionalId" defaultValue={searchParams.professionalId ?? ""}>
            <option value="">Todos</option>
            {professionals.map((professional) => (
              <option key={professional.id} value={professional.id}>
                {professional.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Cliente (nombre)
          <input name="clientName" defaultValue={searchParams.clientName ?? ""} placeholder="Maria" />
        </label>
      </div>
      <div className="admin-filter-actions">
        <button className="admin-primary-button">Filtrar</button>

        <div className="admin-pagination-controls">
          <div>
            Resultados: <strong>{total}</strong>
          </div>
          <label className="admin-pagination-page">
            Página
            <select name="page" defaultValue={String(pageNumber)}>
              {Array.from({ length: lastPage }, (_, index) => index + 1).map((page) => (
                <option key={page} value={String(page)}>
                  {page}
                </option>
              ))}
            </select>
          </label>
          <a
            className="admin-link"
            href={`?${previousQuery}`}
          >
            Prev
          </a>
          <a
            className="admin-link"
            href={`?${nextQuery}`}
          >
            Next
          </a>
        </div>
      </div>
    </form>
  );
}

function withPage(searchParams: SearchParams, page: number) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value) query.set(key, value);
  }
  query.set("page", String(page));
  return query.toString();
}
