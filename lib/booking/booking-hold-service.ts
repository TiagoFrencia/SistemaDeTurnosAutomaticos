import type { AppointmentStatus, TimeRange } from "@/lib/domain/types";

export type BookingHoldInput = {
  businessId: string;
  professionalId: string;
  serviceId: string;
  customerId: string;
  startAt: string;
  endAt: string;
  totalAmount: number;
  depositAmount: number;
};

export type AppointmentRecord = BookingHoldInput & {
  id: string;
  status: AppointmentStatus;
};

export type PaymentRecord = {
  appointmentId: string;
  providerPaymentId: string;
  status: "approved" | "rejected" | "cancelled" | "expired" | "pending";
};

export class BookingConflictError extends Error {
  constructor() {
    super("Appointment slot is no longer available");
    this.name = "BookingConflictError";
  }
}

export class InMemoryBookingHoldStore {
  readonly appointments: AppointmentRecord[] = [];
  readonly payments: PaymentRecord[] = [];
  private nextId = 1;

  async createPendingHold(input: BookingHoldInput): Promise<AppointmentRecord> {
    if (this.hasBlockingOverlap(input)) {
      throw new BookingConflictError();
    }

    const appointment = {
      ...input,
      id: `apt-${this.nextId++}`,
      status: "pending_payment" as const
    };
    this.appointments.push(appointment);
    return appointment;
  }

  seedPendingAppointment(id: string): AppointmentRecord {
    const appointment = {
      id,
      businessId: "biz-1",
      professionalId: "pro-1",
      serviceId: "svc-1",
      customerId: "cus-1",
      startAt: "2026-06-01T09:00:00-03:00",
      endAt: "2026-06-01T10:00:00-03:00",
      totalAmount: 5000,
      depositAmount: 1500,
      status: "pending_payment" as const
    };
    this.appointments.push(appointment);
    return appointment;
  }

  findAppointment(appointmentId: string): AppointmentRecord | undefined {
    return this.appointments.find((appointment) => appointment.id === appointmentId);
  }

  hasPayment(providerPaymentId: string): boolean {
    return this.payments.some((payment) => payment.providerPaymentId === providerPaymentId);
  }

  recordPayment(payment: PaymentRecord): void {
    if (!this.hasPayment(payment.providerPaymentId)) {
      this.payments.push(payment);
    }
  }

  isBlockingAppointment(appointmentId: string): boolean {
    const appointment = this.findAppointment(appointmentId);
    return appointment?.status === "pending_payment" || appointment?.status === "confirmed";
  }

  private hasBlockingOverlap(input: BookingHoldInput): boolean {
    return this.appointments.some((appointment) => {
      if (
        appointment.businessId !== input.businessId ||
        appointment.professionalId !== input.professionalId ||
        !this.isBlockingAppointment(appointment.id)
      ) {
        return false;
      }

      return overlaps(input, appointment);
    });
  }
}

export async function createBookingHold(
  store: InMemoryBookingHoldStore,
  input: BookingHoldInput
): Promise<AppointmentRecord> {
  return store.createPendingHold(input);
}

function overlaps(left: TimeRange, right: TimeRange): boolean {
  return new Date(left.startAt) < new Date(right.endAt) && new Date(left.endAt) > new Date(right.startAt);
}
