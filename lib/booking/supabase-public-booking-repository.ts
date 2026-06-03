import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PublicBookingError,
  type BookingContext,
  type BookingCustomerInput,
  type CreatedBookingHold,
  type PublicBookingRepository
} from "@/lib/booking/public-booking-service";

type DatabaseRow = Record<string, unknown>;

export class SupabasePublicBookingRepository implements PublicBookingRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async loadContext(input: {
    businessSlug: string;
    serviceIds: string[];
    professionalId: string;
  }): Promise<BookingContext | null> {
    const { data: business, error: businessError } = await this.supabase
      .from("businesses")
      .select("id,name,slug,active,mercado_pago_credential_key")
      .eq("slug", input.businessSlug)
      .maybeSingle();

    if (businessError) {
      throw businessError;
    }
    if (!business) {
      return null;
    }

    const businessId = stringField(business, "id");
    const [serviceResult, professionalResult] = await Promise.all([
      this.supabase
        .from("services")
        .select("id,name,duration_minutes,price_amount,deposit_type,deposit_value,active")
        .eq("business_id", businessId)
        .in("id", input.serviceIds),
      this.supabase
        .from("professionals")
        .select("id,active")
        .eq("id", input.professionalId)
        .eq("business_id", businessId)
        .maybeSingle()
    ]);

    if (serviceResult.error) {
      throw serviceResult.error;
    }
    if (professionalResult.error) {
      throw professionalResult.error;
    }
    if (!serviceResult.data || serviceResult.data.length !== input.serviceIds.length || !professionalResult.data) {
      return null;
    }
    const serviceRowsById = new Map(serviceResult.data.map((service) => [stringField(service, "id"), service]));

    return {
      business: {
        id: businessId,
        name: stringField(business, "name"),
        slug: stringField(business, "slug"),
        active: booleanField(business, "active"),
        mercadoPagoCredentialKey: nullableStringField(business, "mercado_pago_credential_key")
      },
      services: input.serviceIds.map((serviceId) => {
        const service = serviceRowsById.get(serviceId);
        if (!service) {
          throw new Error(`Missing service ${serviceId}`);
        }

        return {
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
        };
      }),
      professional: {
        id: stringField(professionalResult.data, "id"),
        active: booleanField(professionalResult.data, "active")
      }
    };
  }

  async upsertCustomer(input: {
    businessId: string;
    customer: BookingCustomerInput;
  }): Promise<{ id: string }> {
    const { data: existing, error: existingError } = await this.supabase
      .from("customers")
      .select("id")
      .eq("business_id", input.businessId)
      .eq("phone", input.customer.phone)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }
    if (existing) {
      const { error: updateError } = await this.supabase
        .from("customers")
        .update({
          full_name: input.customer.fullName,
          email: input.customer.email,
          updated_at: new Date().toISOString()
        })
        .eq("id", stringField(existing, "id"));

      if (updateError) {
        throw updateError;
      }

      return { id: stringField(existing, "id") };
    }

    const { data: customer, error: insertError } = await this.supabase
      .from("customers")
      .insert({
        business_id: input.businessId,
        full_name: input.customer.fullName,
        phone: input.customer.phone,
        email: input.customer.email
      })
      .select("id")
      .single();

    if (insertError) {
      throw insertError;
    }

    return { id: stringField(customer, "id") };
  }

  async createPendingHold(input: {
    businessId: string;
    professionalId: string;
    serviceId: string;
    services: Array<{
      serviceId: string;
      position: number;
      priceAmount: number;
      depositAmount: number;
      durationMinutes: number;
    }>;
    customerId: string;
    startAt: string;
    endAt: string;
    totalAmount: number;
    depositAmount: number;
  }): Promise<CreatedBookingHold> {
    const { data, error } = await this.supabase.rpc("create_booking_hold_with_services", {
      p_business_id: input.businessId,
      p_professional_id: input.professionalId,
      p_service_id: input.serviceId,
      p_services: input.services.map((service) => ({
        service_id: service.serviceId,
        position: service.position,
        price_amount: service.priceAmount,
        deposit_amount: service.depositAmount,
        duration_minutes: service.durationMinutes
      })),
      p_customer_id: input.customerId,
      p_start_at: input.startAt,
      p_end_at: input.endAt,
      p_total_amount: input.totalAmount,
      p_deposit_amount: input.depositAmount
    });

    if (error?.code === "PGRST202") {
      return this.createPendingHoldWithLegacyRpc(input);
    }
    if (error?.code === "23P01") {
      throw new PublicBookingError("conflict", "Ese horario acaba de ser reservado por otra persona.");
    }
    if (error) {
      throw error;
    }
    if (typeof data !== "string") {
      throw new Error("Supabase RPC create_booking_hold_with_services did not return an appointment id");
    }

    return {
      appointmentId: data,
      startAt: input.startAt,
      endAt: input.endAt,
      status: "pending_payment"
    };
  }

  private async createPendingHoldWithLegacyRpc(input: {
    businessId: string;
    professionalId: string;
    serviceId: string;
    services: Array<{
      serviceId: string;
      position: number;
      priceAmount: number;
      depositAmount: number;
      durationMinutes: number;
    }>;
    customerId: string;
    startAt: string;
    endAt: string;
    totalAmount: number;
    depositAmount: number;
  }): Promise<CreatedBookingHold> {
    const { data, error } = await this.supabase.rpc("create_booking_hold", {
      p_business_id: input.businessId,
      p_professional_id: input.professionalId,
      p_service_id: input.serviceId,
      p_customer_id: input.customerId,
      p_start_at: input.startAt,
      p_end_at: input.endAt,
      p_total_amount: input.totalAmount,
      p_deposit_amount: input.depositAmount
    });

    if (error?.code === "23P01") {
      throw new PublicBookingError("conflict", "Ese horario acaba de ser reservado por otra persona.");
    }
    if (error) {
      throw error;
    }
    if (typeof data !== "string") {
      throw new Error("Supabase RPC create_booking_hold did not return an appointment id");
    }

    await this.tryRecordAppointmentServices(data, input.services);

    return {
      appointmentId: data,
      startAt: input.startAt,
      endAt: input.endAt,
      status: "pending_payment"
    };
  }

  private async tryRecordAppointmentServices(
    appointmentId: string,
    services: Array<{
      serviceId: string;
      position: number;
      priceAmount: number;
      depositAmount: number;
      durationMinutes: number;
    }>
  ): Promise<void> {
    const { error } = await this.supabase.from("appointment_services").insert(
      services.map((service) => ({
        appointment_id: appointmentId,
        service_id: service.serviceId,
        position: service.position,
        price_amount: service.priceAmount,
        deposit_amount: service.depositAmount,
        duration_minutes: service.durationMinutes
      }))
    );

    if (error && error.code !== "42P01" && error.code !== "PGRST205") {
      throw error;
    }
  }

  async recordPendingPayment(input: {
    businessId: string;
    appointmentId: string;
    providerPreferenceId: string;
    amount: number;
  }): Promise<void> {
    const { error } = await this.supabase.from("payments").insert({
      business_id: input.businessId,
      appointment_id: input.appointmentId,
      provider_preference_id: input.providerPreferenceId,
      status: "pending",
      amount: input.amount,
      currency: "ARS"
    });

    if (error) {
      throw error;
    }
  }
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
