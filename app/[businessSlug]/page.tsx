import { BusinessHeader } from "@/components/booking/business-header";
import { PublicBookingForm } from "@/components/booking/public-booking-form";
import { brandingThemeStyle } from "@/lib/branding/theme";
import { buildPublicAvailabilityWindow } from "@/lib/public/availability-window";
import type { PublicAvailabilityResponse } from "@/lib/public/public-availability-service";

export const dynamic = "force-dynamic";

export default async function PublicBookingPage({ params }: { params: { businessSlug: string } }) {
  const availability = await fetchAvailability(params.businessSlug);

  if (!availability) {
    return (
      <main className="public-shell">
        <section className="booking-surface" aria-label="Reserva de turno">
          <header className="business-header">
            <div className="booking-kicker">Agenda con seña</div>
            <h1>Agenda no disponible</h1>
            <p>Este negocio todavia no esta activo para recibir reservas online.</p>
          </header>
        </section>
      </main>
    );
  }

  return (
    <main className="public-shell" style={themeStyle(availability.business.branding)}>
      <section className="booking-surface" aria-label="Reserva de turno">
        <BusinessHeader
          business={availability.business}
          depositAmount={availability.service.depositAmount}
          durationMinutes={availability.service.durationMinutes}
        />

        <PublicBookingForm availability={availability} businessSlug={params.businessSlug} />
      </section>
    </main>
  );
}

function themeStyle(branding: PublicAvailabilityResponse["business"]["branding"]) {
  return brandingThemeStyle(branding);
}

async function fetchAvailability(businessSlug: string): Promise<PublicAvailabilityResponse | null> {
  const window = buildPublicAvailabilityWindow();
  const url = new URL(
    `/api/public/businesses/${businessSlug}/availability`,
    process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000"
  );
  url.searchParams.set("from", window.from);
  url.searchParams.set("to", window.to);

  try {
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as PublicAvailabilityResponse;
  } catch {
    return null;
  }
}
