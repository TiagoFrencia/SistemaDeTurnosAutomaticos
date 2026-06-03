import type { AppointmentStatus, PaymentOutcome } from "@/lib/domain/types";

export function statusForPaymentOutcome(outcome: PaymentOutcome): AppointmentStatus {
  if (outcome === "approved") {
    return "confirmed";
  }

  if (outcome === "expired") {
    return "payment_expired";
  }

  if (outcome === "rejected" || outcome === "cancelled") {
    return "payment_failed";
  }

  return "pending_payment";
}

export function blocksAvailability(status: AppointmentStatus): boolean {
  return status === "pending_payment" || status === "confirmed";
}
