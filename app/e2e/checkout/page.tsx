import { notFound } from "next/navigation";

type Props = {
  searchParams?: {
    appointmentId?: string;
    providerPaymentId?: string;
  };
};

export default function E2ECheckoutPage({ searchParams }: Props) {
  if (process.env.E2E_TEST_MODE !== "true") {
    notFound();
  }

  const appointmentId = searchParams?.appointmentId ?? "";
  const providerPaymentId = searchParams?.providerPaymentId ?? "";

  return (
    <main style={{ padding: 32 }}>
      <h1>E2E Checkout</h1>
      <p>Checkout fake para smoke tests.</p>
      <dl>
        <dt>Appointment ID</dt>
        <dd data-testid="appointment-id">{appointmentId}</dd>
        <dt>Provider Payment ID</dt>
        <dd data-testid="provider-payment-id">{providerPaymentId}</dd>
      </dl>
    </main>
  );
}
