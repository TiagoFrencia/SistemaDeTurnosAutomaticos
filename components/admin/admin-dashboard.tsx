import React from "react";
import Link from "next/link";
import { CalendarPlus, Clock, MessageCircle, NotebookTabs } from "lucide-react";

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
  todayLabel?: string;
};

const quickActions = [
  { href: "/admin/turnos", label: "Crear turno", icon: CalendarPlus },
  { href: "/admin/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { href: "/admin/agenda", label: "Horarios", icon: Clock },
  { href: "/admin/turnos", label: "Ver agenda", icon: NotebookTabs }
];

export function AdminDashboard({ metrics, nextAppointment, todayLabel = "Hoy" }: AdminDashboardProps) {
  return (
    <>
      <div className="admin-mobile-date">{todayLabel}</div>

      <div className="admin-dashboard-grid">
        {metrics.map((metric, index) => (
          <DashboardCard key={metric.label} featured={index === 0} {...metric} />
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
          <p>La agenda queda tranquila. Ver agenda →</p>
        )}
        <Link href="/admin/turnos">Ver agenda de hoy</Link>
      </section>

      <div className="admin-quick-title">Acciones rápidas</div>
      <div className="admin-quick-actions" aria-label="Accesos rápidos">
        {quickActions.map((action) => {
          const Icon = action.icon;

          return (
            <Link href={action.href} key={action.label}>
              <Icon size={16} aria-hidden="true" />
              <span>{action.label}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}

function DashboardCard({ href, label, value, helper, featured }: DashboardMetric & { featured?: boolean }) {
  return (
    <Link className={`admin-dashboard-card${featured ? " featured" : ""}`} href={href}>
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
