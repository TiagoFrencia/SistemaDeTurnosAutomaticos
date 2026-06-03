import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AdminAgenda,
  AdminAgendaRepository,
  AdminAvailabilityBlock,
  AdminBusiness,
  AdminBusinessBranding,
  AdminBusinessHour,
  AdminProfessional,
  AdminService
} from "@/lib/admin/admin-agenda-service";

type DatabaseRow = Record<string, unknown>;

export class SupabaseAdminAgendaRepository implements AdminAgendaRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findBusinessBySlug(slug: string): Promise<AdminBusiness | null> {
    const { data, error } = await this.supabase
      .from("businesses")
      .select("id,name,slug,address,active")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? mapBusiness(data) : null;
  }

  async listAgenda(input: { businessId: string }): Promise<AdminAgenda> {
    const [business, services, professionals, businessHours, availabilityBlocks, branding] = await Promise.all([
      this.supabase
        .from("businesses")
        .select("id,name,slug,address,active")
        .eq("id", input.businessId)
        .single(),
      this.supabase
        .from("services")
        .select("id,business_id,name,description,duration_minutes,price_amount,deposit_type,deposit_value,active")
        .eq("business_id", input.businessId)
        .order("created_at", { ascending: true }),
      this.supabase
        .from("professionals")
        .select("id,business_id,name,bio,active")
        .eq("business_id", input.businessId)
        .order("created_at", { ascending: true }),
      this.supabase
        .from("business_hours")
        .select("id,business_id,professional_id,day_of_week,start_time,end_time,active")
        .eq("business_id", input.businessId)
        .order("day_of_week", { ascending: true }),
      this.supabase
        .from("availability_blocks")
        .select("id,business_id,professional_id,start_at,end_at,reason")
        .eq("business_id", input.businessId)
        .order("start_at", { ascending: true }),
      this.loadBranding(input.businessId)
    ]);

    for (const result of [business, services, professionals, businessHours, availabilityBlocks]) {
      if (result.error) {
        throw result.error;
      }
    }
    if (!business.data) {
      throw new Error("Admin agenda business was not found after lookup");
    }

    return {
      business: mapBusiness(business.data),
      branding,
      services: (services.data ?? []).map(mapService),
      professionals: (professionals.data ?? []).map(mapProfessional),
      businessHours: (businessHours.data ?? []).map(mapBusinessHour),
      availabilityBlocks: (availabilityBlocks.data ?? []).map(mapAvailabilityBlock)
    };
  }

  async createService(
    input: Parameters<AdminAgendaRepository["createService"]>[0]
  ): Promise<AdminService> {
    const { data, error } = await this.supabase
      .from("services")
      .insert({
        business_id: input.businessId,
        name: input.name,
        description: input.description ?? null,
        duration_minutes: input.durationMinutes,
        price_amount: input.priceAmount,
        deposit_type: input.depositType,
        deposit_value: input.depositValue,
        active: input.active ?? true
      })
      .select("id,business_id,name,description,duration_minutes,price_amount,deposit_type,deposit_value,active")
      .single();

    if (error) {
      throw error;
    }

    return mapService(data);
  }

  async updateService(
    input: Parameters<AdminAgendaRepository["updateService"]>[0]
  ): Promise<AdminService | null> {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.patch.name !== undefined) patch.name = input.patch.name;
    if (input.patch.description !== undefined) patch.description = input.patch.description;
    if (input.patch.durationMinutes !== undefined) patch.duration_minutes = input.patch.durationMinutes;
    if (input.patch.priceAmount !== undefined) patch.price_amount = input.patch.priceAmount;
    if (input.patch.depositType !== undefined) patch.deposit_type = input.patch.depositType;
    if (input.patch.depositValue !== undefined) patch.deposit_value = input.patch.depositValue;
    if (input.patch.active !== undefined) patch.active = input.patch.active;

    const { data, error } = await this.supabase
      .from("services")
      .update(patch)
      .eq("id", input.serviceId)
      .eq("business_id", input.businessId)
      .select("id,business_id,name,description,duration_minutes,price_amount,deposit_type,deposit_value,active")
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? mapService(data) : null;
  }

  async createProfessional(
    input: Parameters<AdminAgendaRepository["createProfessional"]>[0]
  ): Promise<AdminProfessional> {
    const { data, error } = await this.supabase
      .from("professionals")
      .insert({
        business_id: input.businessId,
        name: input.name,
        bio: input.bio ?? null,
        active: input.active ?? true
      })
      .select("id,business_id,name,bio,active")
      .single();

    if (error) {
      throw error;
    }

    return mapProfessional(data);
  }

  async updateProfessional(
    input: Parameters<AdminAgendaRepository["updateProfessional"]>[0]
  ): Promise<AdminProfessional | null> {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.patch.name !== undefined) patch.name = input.patch.name;
    if (input.patch.bio !== undefined) patch.bio = input.patch.bio;
    if (input.patch.active !== undefined) patch.active = input.patch.active;

    const { data, error } = await this.supabase
      .from("professionals")
      .update(patch)
      .eq("id", input.professionalId)
      .eq("business_id", input.businessId)
      .select("id,business_id,name,bio,active")
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? mapProfessional(data) : null;
  }

  async replaceBusinessHours(
    input: Parameters<AdminAgendaRepository["replaceBusinessHours"]>[0]
  ): Promise<AdminBusinessHour[]> {
    let deleteQuery = this.supabase.from("business_hours").delete().eq("business_id", input.businessId);
    deleteQuery = input.professionalId
      ? deleteQuery.eq("professional_id", input.professionalId)
      : deleteQuery.is("professional_id", null);

    const { error: deleteError } = await deleteQuery;
    if (deleteError) {
      throw deleteError;
    }

    if (input.hours.length === 0) {
      return [];
    }

    const { data, error } = await this.supabase
      .from("business_hours")
      .insert(
        input.hours.map((hour) => ({
          business_id: input.businessId,
          professional_id: input.professionalId ?? null,
          day_of_week: hour.dayOfWeek,
          start_time: hour.startTime,
          end_time: hour.endTime,
          active: hour.active ?? true
        }))
      )
      .select("id,business_id,professional_id,day_of_week,start_time,end_time,active")
      .order("day_of_week", { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapBusinessHour);
  }

  async createAvailabilityBlock(
    input: Parameters<AdminAgendaRepository["createAvailabilityBlock"]>[0]
  ): Promise<AdminAvailabilityBlock> {
    const { data, error } = await this.supabase
      .from("availability_blocks")
      .insert({
        business_id: input.businessId,
        professional_id: input.professionalId ?? null,
        start_at: input.startAt,
        end_at: input.endAt,
        reason: input.reason ?? null
      })
      .select("id,business_id,professional_id,start_at,end_at,reason")
      .single();

    if (error) {
      throw error;
    }

    return mapAvailabilityBlock(data);
  }

  async upsertBranding(
    input: Parameters<AdminAgendaRepository["upsertBranding"]>[0]
  ): Promise<AdminBusinessBranding> {
    const { data, error } = await this.supabase
      .from("business_branding")
      .upsert(
        {
          business_id: input.businessId,
          primary_color: input.primaryColor,
          theme_preset: input.themePreset,
          hero_text: input.heroText,
          visual_mode: input.visualMode,
          logo_url: input.logoUrl,
          updated_at: new Date().toISOString()
        },
        { onConflict: "business_id" }
      )
      .select("primary_color,theme_preset,hero_text,visual_mode,logo_url")
      .single();

    if (error) {
      throw error;
    }

    return mapBranding(data);
  }

  private async loadBranding(businessId: string): Promise<AdminBusinessBranding> {
    const { data, error } = await this.supabase
      .from("business_branding")
      .select("primary_color,theme_preset,hero_text,visual_mode,logo_url")
      .eq("business_id", businessId)
      .maybeSingle();

    if (error) {
      return defaultBranding();
    }

    return data ? mapBranding(data) : defaultBranding();
  }
}

function mapBusiness(row: DatabaseRow): AdminBusiness {
  return {
    id: stringField(row, "id"),
    name: stringField(row, "name"),
    slug: stringField(row, "slug"),
    address: nullableStringField(row, "address"),
    active: booleanField(row, "active")
  };
}

function mapService(row: DatabaseRow): AdminService {
  const priceAmount = numberField(row, "price_amount");
  const depositType = stringField(row, "deposit_type") as "fixed" | "percentage";
  const depositValue = numberField(row, "deposit_value");

  return {
    id: stringField(row, "id"),
    businessId: stringField(row, "business_id"),
    name: stringField(row, "name"),
    description: nullableStringField(row, "description"),
    durationMinutes: numberField(row, "duration_minutes"),
    priceAmount,
    depositType,
    depositValue,
    depositAmount: depositType === "percentage" ? Math.round((priceAmount * depositValue) / 100) : depositValue,
    active: booleanField(row, "active")
  };
}

function mapProfessional(row: DatabaseRow): AdminProfessional {
  return {
    id: stringField(row, "id"),
    businessId: stringField(row, "business_id"),
    name: stringField(row, "name"),
    bio: nullableStringField(row, "bio"),
    active: booleanField(row, "active")
  };
}

function mapBusinessHour(row: DatabaseRow): AdminBusinessHour {
  return {
    id: stringField(row, "id"),
    businessId: stringField(row, "business_id"),
    professionalId: nullableStringField(row, "professional_id"),
    dayOfWeek: numberField(row, "day_of_week"),
    startTime: stringField(row, "start_time").slice(0, 5),
    endTime: stringField(row, "end_time").slice(0, 5),
    active: booleanField(row, "active")
  };
}

function mapAvailabilityBlock(row: DatabaseRow): AdminAvailabilityBlock {
  return {
    id: stringField(row, "id"),
    businessId: stringField(row, "business_id"),
    professionalId: nullableStringField(row, "professional_id"),
    startAt: stringField(row, "start_at"),
    endAt: stringField(row, "end_at"),
    reason: nullableStringField(row, "reason")
  };
}

function mapBranding(row: DatabaseRow): AdminBusinessBranding {
  return {
    primaryColor: stringField(row, "primary_color"),
    themePreset: themePresetField(row, "theme_preset"),
    heroText: stringField(row, "hero_text"),
    visualMode: stringField(row, "visual_mode") === "compact" ? "compact" : "default",
    logoUrl: nullableStringField(row, "logo_url")
  };
}

function defaultBranding(): AdminBusinessBranding {
  return {
    primaryColor: "#24594c",
    themePreset: "editorial_green",
    heroText: "Turnos confirmados para que tu horario quede cuidado desde el primer clic.",
    visualMode: "default",
    logoUrl: null
  };
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

function themePresetField(row: DatabaseRow, key: string): AdminBusinessBranding["themePreset"] {
  const value = row[key];
  return typeof value === "string" &&
    ["editorial_green", "soft_rose", "warm_terracotta", "calm_blue", "minimal_dark"].includes(value)
    ? (value as AdminBusinessBranding["themePreset"])
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
