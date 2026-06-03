import React from "react";

type ServiceOption = {
  id: string;
  name: string;
  durationMinutes: number;
  priceAmount: number;
  depositAmount: number;
};

type ProfessionalOption = {
  id: string;
  name: string;
};

export function ServiceSelector({
  depositAmount,
  durationMinutes,
  isRefreshing,
  onProfessionalChange,
  onServiceChange,
  priceAmount,
  professionals,
  selectedProfessionalId,
  selectedProfessionalName,
  selectedServiceIds,
  selectedServiceName,
  services
}: {
  depositAmount: number;
  durationMinutes: number;
  isRefreshing: boolean;
  onProfessionalChange: (professionalId: string) => void;
  onServiceChange: (serviceIds: string[]) => void;
  priceAmount: number;
  professionals: ProfessionalOption[];
  selectedProfessionalId: string;
  selectedProfessionalName: string;
  selectedServiceIds: string[];
  selectedServiceName: string;
  services: ServiceOption[];
}) {
  const selectedServices = services.filter((service) => selectedServiceIds.includes(service.id));

  function toggleService(serviceId: string) {
    const isSelected = selectedServiceIds.includes(serviceId);
    if (isSelected && selectedServiceIds.length === 1) {
      return;
    }

    const nextServiceIds = isSelected
      ? selectedServiceIds.filter((selectedServiceId) => selectedServiceId !== serviceId)
      : [...selectedServiceIds, serviceId];

    onServiceChange(nextServiceIds);
  }

  return (
    <section className="booking-section" aria-labelledby="service-section-title">
      <div className="section-label">
        <span className="section-number">02</span>
        <h3 id="service-section-title">Servicio y profesional</h3>
      </div>

      <div className="service-choice-list" aria-busy={isRefreshing} aria-label="Servicios">
        {services.map((service) => {
          const checked = selectedServiceIds.includes(service.id);
          return (
            <label className="service-choice" data-selected={checked ? "true" : undefined} key={service.id}>
              <input
                checked={checked}
                disabled={isRefreshing || (checked && selectedServiceIds.length === 1)}
                onChange={() => toggleService(service.id)}
                type="checkbox"
              />
              <span>
                <strong>{service.name}</strong>
                <small>
                  {service.durationMinutes} min · Seña {formatMoney(service.depositAmount)}
                </small>
              </span>
            </label>
          );
        })}
      </div>

      <div className="selector-grid">
        <label className="field">
          <span>Profesional</span>
          <select
            aria-busy={isRefreshing}
            onChange={(event) => onProfessionalChange(event.target.value)}
            value={selectedProfessionalId}
          >
            {professionals.map((professional) => (
              <option key={professional.id} value={professional.id}>
                {professional.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="booking-note" aria-live="polite">
        <div>
          <strong>{selectedServiceName}</strong>
          <span>con {selectedProfessionalName}</span>
          {selectedServices.length > 1 ? (
            <ul className="selected-services-list">
              {selectedServices.map((service) => (
                <li key={service.id}>{service.name}</li>
              ))}
            </ul>
          ) : null}
        </div>
        <dl className="price-strip">
          <div>
            <dt>Total</dt>
            <dd>{formatMoney(priceAmount)}</dd>
          </div>
          <div>
            <dt>Seña</dt>
            <dd>{formatMoney(depositAmount)}</dd>
          </div>
          <div>
            <dt>Duración</dt>
            <dd>{durationMinutes} min</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  }).format(amount);
}
