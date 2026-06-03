import React from "react";
import Link from "next/link";

type DashboardMetric = {
  href: string;
  label: string;
  value: number;
  helper: string;
};

type NextAppointment = {
  customerName: string;
  serviceName: string;
  professionalName: string;
  startAt: string;
} | null;

type AdminDashboardProps = {
  metrics: DashboardMetric[];
  nextAppointment: NextAppointment;
};

export function AdminDashboard({ metrics, nextAppointment }: AdminDashboardProps) {
  return (
    <>
      <div className="admin-dashboard-grid">
        {metrics.map((metric) => (
          <DashboardCard key={metric.label} {...metric} />
        ))}
      </div>

      <section className="admin-next-card" aria-labelledby="next-appointment-title">
        <div>
          <p className="admin-card-eyebrow">Próximo turno</p>
          <h2 id="next-appointment-title">
            {nextAppointment ? `${formatTime(nextAppointment.startAt)} · ${nextAppointment.customerName}` : "No hay más turnos hoy"}
          </h2>
        </div>
        {nextAppointment ? (
          <p>
            {nextAppointment.serviceName} con {nextAppointment.professionalName}. Revisá el detalle si necesitás
            confirmar seña, saldo o asistencia.
          </p>
        ) : (
          <p>La agenda de hoy queda tranquila. Si entra una clienta por WhatsApp, revisá el panel de chats.</p>
        )}
        <Link href="/admin/turnos">Ver agenda de hoy</Link>
      </section>

      <div className="admin-quick-actions" aria-label="Accesos rápidos">
        <Link href="/admin/turnos">Ver agenda de hoy</Link>
        <Link href="/admin/turnos">Crear turno manual</Link>
        <Link href="/admin/whatsapp">Revisar WhatsApp</Link>
        <Link href="/admin/agenda">Configurar horarios</Link>
      </div>
    </>
  );
}

function DashboardCard({ href, label, value, helper }: DashboardMetric) {
  return (
    <Link className="admin-dashboard-card" href={href}>
      <span>{label}</span>
      <strong>{value}</strong>
      <em>{helper}</em>
    </Link>
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires"
  }).format(new Date(value));
}
