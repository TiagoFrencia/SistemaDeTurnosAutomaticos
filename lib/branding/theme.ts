import type { CSSProperties } from "react";

export const brandingThemePresets = {
  editorial_green: {
    label: "Verde editorial",
    brand: "#24594c",
    brandStrong: "#183f35",
    brandSoft: "#e1eee9",
    brandInk: "#183f35",
    brandBorder: "rgba(36, 89, 76, 0.2)",
    brandGrid: "rgba(36, 89, 76, 0.07)",
    cta: "#b64f34",
    ctaStrong: "#84331f"
  },
  soft_rose: {
    label: "Rosa suave",
    brand: "#9f4f62",
    brandStrong: "#743644",
    brandSoft: "#f5e5e8",
    brandInk: "#6f3341",
    brandBorder: "rgba(159, 79, 98, 0.22)",
    brandGrid: "rgba(159, 79, 98, 0.06)",
    cta: "#9f4f62",
    ctaStrong: "#743644"
  },
  warm_terracotta: {
    label: "Terracota calido",
    brand: "#a35236",
    brandStrong: "#78351f",
    brandSoft: "#f1e4dc",
    brandInk: "#743a25",
    brandBorder: "rgba(163, 82, 54, 0.22)",
    brandGrid: "rgba(163, 82, 54, 0.06)",
    cta: "#b64f34",
    ctaStrong: "#84331f"
  },
  calm_blue: {
    label: "Azul sereno",
    brand: "#315f7c",
    brandStrong: "#21465e",
    brandSoft: "#e1edf3",
    brandInk: "#24475e",
    brandBorder: "rgba(49, 95, 124, 0.22)",
    brandGrid: "rgba(49, 95, 124, 0.06)",
    cta: "#315f7c",
    ctaStrong: "#21465e"
  },
  minimal_dark: {
    label: "Minimal oscuro",
    brand: "#2f2b27",
    brandStrong: "#211b16",
    brandSoft: "#e9e4dc",
    brandInk: "#211b16",
    brandBorder: "rgba(47, 43, 39, 0.22)",
    brandGrid: "rgba(47, 43, 39, 0.05)",
    cta: "#2f2b27",
    ctaStrong: "#211b16"
  }
} as const;

export type BrandingThemePreset = keyof typeof brandingThemePresets;

export type ThemeableBranding = {
  primaryColor: string;
  themePreset?: string | null;
};

export function normalizeThemePreset(value: string | null | undefined): BrandingThemePreset {
  return isBrandingThemePreset(value) ? value : "editorial_green";
}

export function isBrandingThemePreset(value: unknown): value is BrandingThemePreset {
  return typeof value === "string" && value in brandingThemePresets;
}

export function brandingThemeStyle(branding: ThemeableBranding): CSSProperties {
  const preset = brandingThemePresets[normalizeThemePreset(branding.themePreset)];
  const accent = isHexColor(branding.primaryColor) ? branding.primaryColor : preset.brand;

  return {
    "--brand": preset.brand,
    "--brand-strong": preset.brandStrong,
    "--brand-soft": preset.brandSoft,
    "--brand-ink": preset.brandInk,
    "--brand-border": preset.brandBorder,
    "--brand-grid": preset.brandGrid,
    "--cta": preset.cta,
    "--cta-strong": preset.ctaStrong,
    "--accent-custom": accent,
    "--forest": preset.brand,
    "--forest-soft": preset.brandSoft,
    "--accent": preset.cta,
    "--accent-strong": preset.ctaStrong
  } as CSSProperties;
}

function isHexColor(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}
