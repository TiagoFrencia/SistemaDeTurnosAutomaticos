"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
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

export function AdminSidebar({ logoUrl }: AdminSidebarProps) {
  const pathname = usePathname();
  const [logoFailed, setLogoFailed] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const showLogo = logoUrl && !logoFailed;

  return (
    <aside className="admin-sidebar" aria-label="Navegación admin">
      <div className="admin-sidebar-main">
        <a className="admin-brand-lockup" href="/admin" aria-label="Ir al inicio admin">
          {showLogo ? (
            <span className="admin-logo-frame" aria-hidden="true">
              <span className="admin-logo-fallback">A</span>
              {/* The logo URL is admin-provided, so Next Image remote patterns cannot be known ahead of time. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
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

        <nav className="admin-nav">
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
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
