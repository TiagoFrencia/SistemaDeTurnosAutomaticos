export type PendingPaymentExpiryRepository = {
  listExpiredPendingAppointments(input: { cutoff: string; limit: number }): Promise<
    Array<{
      id: string;
      payments: Array<{ status: string }>;
    }>
  >;
  markAppointmentsExpired(input: { appointmentIds: string[]; now: string }): Promise<void>;
  markPendingPaymentsExpired(input: { appointmentIds: string[]; now: string }): Promise<void>;
};

export async function expirePendingPaymentHolds(
  repository: PendingPaymentExpiryRepository,
  now = new Date(),
  expiryMinutes = 30
): Promise<{ scanned: number; expired: number }> {
  const cutoff = new Date(now.getTime() - expiryMinutes * 60 * 1000).toISOString();
  const appointments = await repository.listExpiredPendingAppointments({ cutoff, limit: 100 });
  const appointmentIds = appointments
    .filter((appointment) => appointment.payments.length === 0 || appointment.payments.every((payment) => payment.status === "pending"))
    .map((appointment) => appointment.id);

  if (appointmentIds.length === 0) {
    return { scanned: appointments.length, expired: 0 };
  }

  await repository.markAppointmentsExpired({ appointmentIds, now: now.toISOString() });
  await repository.markPendingPaymentsExpired({ appointmentIds, now: now.toISOString() });

  return { scanned: appointments.length, expired: appointmentIds.length };
}
