"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { CalendarDays, Clock, Home, MessageCircle, Settings } from "lucide-react";
import { AdminSignOutButton } from "@/components/admin/admin-sign-out-button";

type AdminSidebarProps = {
  logoUrl?: string | null;
};

const navSections = [
  {
    label: "Operación",
    items: [
      { href: "/admin", label: "Inicio" },
      { href: "/admin/turnos", label: "Turnos" },
      { href: "/admin/whatsapp", label: "WhatsApp" },
      { href: "/admin/agenda", label: "Agenda" }
    ]
  },
  {
    label: "Configuración",
    items: [
      { href: "/admin/servicios", label: "Servicios" },
      { href: "/admin/profesionales", label: "Profesionales" },
      { href: "/admin/personalizacion", label: "Personalización" }
    ]
  },
  {
    label: "Cuenta",
    items: [
      { href: "/admin/cuenta", label: "Cuenta" },
      { href: "/achul-nails", label: "Reserva pública" }
    ]
  }
];

const mobileNavItems = [
  { href: "/admin", label: "Inicio", icon: Home, match: [] },
  { href: "/admin/turnos", label: "Turnos", icon: CalendarDays, match: [] },
  { href: "/admin/whatsapp", label: "WhatsApp", icon: MessageCircle, match: [] },
  { href: "/admin/agenda", label: "Agenda", icon: Clock, match: [] },
  {
    href: "/admin/servicios",
    label: "Config.",
    icon: Settings,
    match: ["/admin/profesionales", "/admin/personalizacion", "/admin/cuenta"]
  }
];

export function AdminSidebar({ logoUrl }: AdminSidebarProps) {
  const pathname = usePathname();
  const [logoFailed, setLogoFailed] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const showLogo = Boolean(logoUrl && !logoFailed);

  return (
    <>
      <aside className="admin-sidebar" aria-label="Navegación admin">
        <div className="admin-sidebar-main">
          <BrandLockup
            showLogo={showLogo}
            logoUrl={logoUrl}
            logoLoaded={logoLoaded}
            setLogoFailed={setLogoFailed}
            setLogoLoaded={setLogoLoaded}
          />

          <nav className="admin-nav" aria-label="Navegación admin">
            {navSections.map((section) => (
              <div className="admin-nav-section" key={section.label}>
                <p>{section.label}</p>
                {section.items.map((item) => (
                  <a
                    aria-current={isActive(pathname, item.href) ? "page" : undefined}
                    className="admin-nav-link"
                    href={item.href}
                    key={item.href}
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            ))}
          </nav>
        </div>

        <div className="admin-sidebar-footer">
          <AdminSignOutButton />
        </div>
      </aside>

      <header className="admin-mobile-header" aria-label="Encabezado admin mobile">
        <div>
          <strong>{mobileTitle(pathname)}</strong>
          <span>{mobileSubtitle(pathname)}</span>
        </div>
        <div className="admin-mobile-header-actions">
          <span className="admin-mobile-menu-dots" aria-hidden="true">•••</span>
          <a className="admin-mobile-avatar" href="/admin/cuenta" aria-label="Ir a cuenta admin">
            A
          </a>
        </div>
      </header>

      <nav className="admin-mobile-bottom-nav" aria-label="Navegación admin mobile">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href) || item.match.some((href) => isActive(pathname, href));

          return (
            <a key={item.href} href={item.href} aria-current={active ? "page" : undefined}>
              <Icon size={18} strokeWidth={2.1} aria-hidden="true" />
              <span>{item.label}</span>
            </a>
          );
        })}
      </nav>
    </>
  );
}

function BrandLockup({
  showLogo,
  logoUrl,
  logoLoaded,
  setLogoFailed,
  setLogoLoaded
}: {
  showLogo: boolean;
  logoUrl?: string | null;
  logoLoaded: boolean;
  setLogoFailed: (value: boolean) => void;
  setLogoLoaded: (value: boolean) => void;
}) {
  return (
    <a className="admin-brand-lockup" href="/admin" aria-label="Ir al inicio admin">
      {showLogo ? (
        <span className="admin-logo-frame" aria-hidden="true">
          <span className="admin-logo-fallback">A</span>
          {/* The logo URL is admin-provided, so Next Image remote patterns cannot be known ahead of time. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl ?? ""}
            alt=""
            className={`admin-logo${logoLoaded ? " is-loaded" : ""}`}
            onError={() => setLogoFailed(true)}
            onLoad={() => setLogoLoaded(true)}
          />
        </span>
      ) : (
        <span className="admin-logo-fallback" aria-hidden="true">
          A
        </span>
      )}
      <span>
        <small>Achul_Nails</small>
        <strong>Panel admin</strong>
      </span>
    </a>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function mobileTitle(pathname: string) {
  if (pathname.startsWith("/admin/turnos")) return "Turnos";
  if (pathname.startsWith("/admin/whatsapp")) return "WhatsApp";
  if (pathname.startsWith("/admin/agenda")) return "Agenda";
  if (pathname.startsWith("/admin/servicios")) return "Servicios";
  if (pathname.startsWith("/admin/profesionales")) return "Profesionales";
  if (pathname.startsWith("/admin/personalizacion")) return "Personalización";
  if (pathname.startsWith("/admin/cuenta")) return "Cuenta";
  return "Achul_Nails";
}

function mobileSubtitle(pathname: string) {
  if (pathname.startsWith("/admin/turnos")) return "Reservas y pagos";
  if (pathname.startsWith("/admin/whatsapp")) return "Operación de chats";
  if (pathname.startsWith("/admin/agenda")) return "Horarios y bloqueos";
  if (pathname.startsWith("/admin/servicios")) return "Configuración";
  if (pathname.startsWith("/admin/profesionales")) return "Equipo";
  if (pathname.startsWith("/admin/personalizacion")) return "Apariencia";
  if (pathname.startsWith("/admin/cuenta")) return "Acceso admin";
  return "Panel admin";
}
