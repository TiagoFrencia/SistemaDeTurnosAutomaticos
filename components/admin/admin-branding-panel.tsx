"use client";

import React, { useState } from "react";
import {
  brandingThemePresets,
  normalizeThemePreset,
  type BrandingThemePreset
} from "@/lib/branding/theme";
import type { AdminBusinessBranding } from "@/lib/admin/admin-agenda-service";

type Props = {
  businessSlug: string;
  branding: AdminBusinessBranding;
};

const themeOptions = Object.entries(brandingThemePresets) as Array<
  [BrandingThemePreset, (typeof brandingThemePresets)[BrandingThemePreset]]
>;

export function AdminBrandingPanel({ businessSlug, branding }: Props) {
  const [current, setCurrent] = useState(branding);
  const [selectedTheme, setSelectedTheme] = useState<BrandingThemePreset>(
    normalizeThemePreset(branding.themePreset)
  );
  const [accentColor, setAccentColor] = useState(branding.primaryColor);
  const [heroText, setHeroText] = useState(branding.heroText);
  const [logoUrl, setLogoUrl] = useState(branding.logoUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);

    const data = new FormData(event.currentTarget);
    const token = readAdminToken();
    const response = await fetch(`/api/admin/branding?businessSlug=${businessSlug}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        primaryColor: String(data.get("primaryColor") ?? "#24594c"),
        themePreset: String(data.get("themePreset") ?? "editorial_green"),
        heroText: String(data.get("heroText") ?? ""),
        visualMode: String(data.get("visualMode") ?? "default"),
        logoUrl: String(data.get("logoUrl") ?? "").trim() || null
      })
    });
    const body = await response.json().catch(() => ({}));
    setSaving(false);

    if (!response.ok) {
      setError(
        response.status === 401
          ? "Guardá la clave admin y volvé a intentar."
          : body.error ?? "No pudimos guardar la personalización."
      );
      return;
    }

    setCurrent(body);
    setSelectedTheme(normalizeThemePreset(body.themePreset));
    setAccentColor(body.primaryColor);
    setHeroText(body.heroText);
    setLogoUrl(body.logoUrl ?? "");
    setSaved(true);
  }

  const activeTheme = brandingThemePresets[selectedTheme];

  return (
    <section className="admin-panel" aria-labelledby="branding-title">
      <div className="admin-panel-heading">
        <div>
          <p className="admin-kicker">Personalización</p>
          <h1 id="branding-title">Apariencia del negocio</h1>
          <p className="admin-help">
            Elegí un estilo visual seguro para que la reserva se vea propia, clara y prolija.
          </p>
        </div>
        <a href="/achul-nails" className="admin-link">
          Ver reserva pública
        </a>
      </div>

      <form className="admin-form branding-form" onSubmit={submit}>
        <fieldset className="theme-picker">
          <legend>Estilo visual</legend>
          <div className="theme-card-grid">
            {themeOptions.map(([key, theme]) => (
              <label className="theme-card" data-selected={selectedTheme === key ? "true" : undefined} key={key}>
                <input
                  aria-label={theme.label}
                  checked={selectedTheme === key}
                  name="themePreset"
                  onChange={() => setSelectedTheme(key)}
                  type="radio"
                  value={key}
                />
                <span className="theme-card-header">
                  <span>{theme.label}</span>
                  <span className="theme-swatches" aria-hidden="true">
                    <i style={{ background: theme.brand }} />
                    <i style={{ background: theme.brandSoft }} />
                    <i style={{ background: theme.cta }} />
                  </span>
                </span>
                <span className="theme-card-preview" style={themePreviewStyle(theme, accentColor)}>
                  <span className="theme-preview-kicker">Agenda con seña</span>
                  <span className="theme-preview-row">
                    <b>01-Jun</b>
                    <em>12:00</em>
                  </span>
                  <span className="theme-preview-cta">Continuar</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="branding-layout">
          <div className="branding-fields">
            <div className="admin-form-grid branding-grid">
              <div className="admin-field">
                <label htmlFor="primaryColor">Acento avanzado</label>
                <span className="input-affix color-affix">
                  <input
                    id="primaryColor"
                    name="primaryColor"
                    onChange={(event) => setAccentColor(event.target.value)}
                    type="color"
                    value={accentColor}
                  />
                  <input name="primaryColorText" value={accentColor} readOnly aria-label="Color actual" />
                </span>
                <small>Se usa solo en detalles activos y previews, no en todo el diseño.</small>
              </div>
              <label>
                Modo visual
                <select name="visualMode" defaultValue={current.visualMode}>
                  <option value="default">Default</option>
                  <option value="compact">Compacto</option>
                </select>
              </label>
            </div>

            <label>
              Texto de portada
              <textarea
                name="heroText"
                onChange={(event) => setHeroText(event.target.value)}
                rows={3}
                minLength={10}
                maxLength={180}
                value={heroText}
                placeholder="Turnos confirmados para que tu horario quede cuidado desde el primer clic."
              />
            </label>
            <label>
              URL del logo
              <input
                name="logoUrl"
                onChange={(event) => setLogoUrl(event.target.value)}
                type="url"
                value={logoUrl}
                placeholder="https://tu-dominio.com/logo.png"
              />
            </label>
            <p className="admin-help">
              Usá una imagen PNG/JPG horizontal o cuadrada, idealmente con fondo transparente.
            </p>
          </div>

          <aside className="branding-preview" style={themePreviewStyle(activeTheme, accentColor)}>
            <p className="branding-preview-label">Así lo verá tu cliente</p>
            <div className="branding-preview-card">
              <span className="theme-preview-kicker">Agenda con seña</span>
              <div className="branding-preview-lockup">
                {logoUrl ? (
                  // The logo URL is admin-provided, so Next Image remote patterns cannot be known ahead of time.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="" />
                ) : null}
                <strong>Achul_Nails</strong>
              </div>
              <p>{heroText}</p>
              <div className="booking-meta mini">
                <span>Seña $ 1.500</span>
                <span>60 min</span>
              </div>
              <button type="button">Continuar</button>
            </div>
          </aside>
        </div>

        {error ? <p className="admin-error">{error}</p> : null}
        {saved ? <p className="admin-success">Personalización guardada.</p> : null}
        <button className="admin-primary-button" disabled={saving}>
          {saving ? "Guardando..." : "Guardar apariencia"}
        </button>
      </form>
    </section>
  );
}

function themePreviewStyle(
  theme: (typeof brandingThemePresets)[BrandingThemePreset],
  accentColor: string
): React.CSSProperties {
  return {
    "--brand": theme.brand,
    "--brand-soft": theme.brandSoft,
    "--brand-ink": theme.brandInk,
    "--brand-border": theme.brandBorder,
    "--cta": theme.cta,
    "--accent-custom": accentColor
  } as React.CSSProperties;
}

function readAdminToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const fromStorage = localStorage.getItem("ADMIN_API_KEY");
  if (fromStorage) {
    return fromStorage;
  }

  const match = document.cookie.match(new RegExp("(?:^|; )admin_api_key=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}
