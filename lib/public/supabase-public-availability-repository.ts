import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  PublicAvailabilityData,
  PublicAvailabilityRepository
} from "@/lib/public/public-availability-service";

type DatabaseRow = Record<string, unknown>;

export class SupabasePublicAvailabilityRepository implements PublicAvailabilityRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async load(input: { businessSlug: string; from: string; to: string }): Promise<PublicAvailabilityData> {
    const { data: business, error: businessError } = await this.supabase
      .from("businesses")
      .select("id,name,slug,address,active")
      .eq("slug", input.businessSlug)
      .maybeSingle();

    if (businessError) {
      throw businessError;
    }

    if (!business) {
      return {
        business: null,
        services: [],
        professionals: [],
        businessHours: [],
        appointments: [],
        blocks: []
      };
    }

    const businessId = stringField(business, "id");
    const [services, professionals, businessHours, appointments, blocks, branding] = await Promise.all([
      this.supabase
        .from("services")
        .select("id,name,duration_minutes,price_amount,deposit_type,deposit_value,active")
        .eq("business_id", businessId)
        .eq("active", true),
      this.supabase
        .from("professionals")
        .select("id,name,active")
        .eq("business_id", businessId)
        .eq("active", true),
      this.supabase
        .from("business_hours")
        .select("day_of_week,start_time,end_time")
        .eq("business_id", businessId)
        .eq("active", true),
      this.supabase
        .from("appointments")
        .select("professional_id,start_at,end_at,status")
        .eq("business_id", businessId)
        .lt("start_at", input.to)
        .gt("end_at", input.from),
      this.supabase
        .from("availability_blocks")
        .select("professional_id,start_at,end_at")
        .eq("business_id", businessId)
        .lt("start_at", input.to)
        .gt("end_at", input.from),
      this.loadBranding(businessId)
    ]);

    for (const result of [services, professionals, businessHours, appointments, blocks]) {
      if (result.error) {
        throw result.error;
      }
    }

    return {
      business: {
        id: businessId,
        name: stringField(business, "name"),
        slug: stringField(business, "slug"),
        address: nullableStringField(business, "address"),
        active: booleanField(business, "active"),
        branding
      },
      services: (services.data ?? []).map((service) => ({
        id: stringField(service, "id"),
        name: stringField(service, "name"),
        durationMinutes: numberField(service, "duration_minutes"),
        priceAmount: numberField(service, "price_amount"),
        depositAmount: calculateDepositAmount(
          numberField(service, "price_amount"),
          stringField(service, "deposit_type"),
          numberField(service, "deposit_value")
        ),
        active: booleanField(service, "active")
      })),
      professionals: (professionals.data ?? []).map((professional) => ({
        id: stringField(professional, "id"),
        name: stringField(professional, "name"),
        active: booleanField(professional, "active")
      })),
      businessHours: (businessHours.data ?? []).map((hour) => ({
        dayOfWeek: numberField(hour, "day_of_week"),
        startTime: stringField(hour, "start_time").slice(0, 5),
        endTime: stringField(hour, "end_time").slice(0, 5)
      })),
      appointments: (appointments.data ?? []).map((appointment) => ({
        professionalId: stringField(appointment, "professional_id"),
        startAt: stringField(appointment, "start_at"),
        endAt: stringField(appointment, "end_at"),
        status: appointment.status as never
      })),
      blocks: (blocks.data ?? []).map((block) => ({
        professionalId: nullableStringField(block, "professional_id"),
        startAt: stringField(block, "start_at"),
        endAt: stringField(block, "end_at")
      }))
    };
  }

  private async loadBranding(businessId: string) {
    const { data, error } = await this.supabase
      .from("business_branding")
      .select("primary_color,theme_preset,hero_text,visual_mode,logo_url")
      .eq("business_id", businessId)
      .maybeSingle();

    if (error) {
      return defaultBranding();
    }

    return data
      ? {
          primaryColor: stringField(data, "primary_color"),
          themePreset: themePresetField(data, "theme_preset"),
          heroText: stringField(data, "hero_text"),
          visualMode: stringField(data, "visual_mode") === "compact" ? ("compact" as const) : ("default" as const),
          logoUrl: nullableStringField(data, "logo_url")
        }
      : defaultBranding();
  }
}

function defaultBranding() {
  return {
    primaryColor: "#24594c",
    themePreset: "editorial_green" as const,
    heroText: "Turnos confirmados para que tu horario quede cuidado desde el primer clic.",
    visualMode: "default" as const,
    logoUrl: null
  };
}

function calculateDepositAmount(priceAmount: number, depositType: string, depositValue: number): number {
  if (depositType === "percentage") {
    return Math.round((priceAmount * depositValue) / 100);
  }

  return depositValue;
}

function stringField(row: DatabaseRow, key: string): string {
  const value = row[key];
  if (typeof value !== "string") {
    throw new Error(`Expected ${key} to be a string`);
  }
  return value;
}

function nullableStringField(row: DatabaseRow, key: string): string | null {
  const value = row[key];
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "string") {
    throw new Error(`Expected ${key} to be a nullable string`);
  }
  return value;
}

function themePresetField(
  row: DatabaseRow,
  key: string
): "editorial_green" | "soft_rose" | "warm_terracotta" | "calm_blue" | "minimal_dark" {
  const value = row[key];
  return typeof value === "string" &&
    ["editorial_green", "soft_rose", "warm_terracotta", "calm_blue", "minimal_dark"].includes(value)
    ? (value as "editorial_green" | "soft_rose" | "warm_terracotta" | "calm_blue" | "minimal_dark")
    : "editorial_green";
}

function numberField(row: DatabaseRow, key: string): number {
  const value = row[key];
  if (typeof value !== "number") {
    throw new Error(`Expected ${key} to be a number`);
  }
  return value;
}

function booleanField(row: DatabaseRow, key: string): boolean {
  const value = row[key];
  if (typeof value !== "boolean") {
    throw new Error(`Expected ${key} to be a boolean`);
  }
  return value;
}
