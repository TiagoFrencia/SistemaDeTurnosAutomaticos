import Link from "next/link";

export default function HomePage() {
  return (
    <main className="public-shell">
      <div className="booking-surface">
        <header className="business-header">
          <h1>Turnos Estetica</h1>
          <p>Base MVP para agenda, sena y confirmacion de turnos.</p>
        </header>
        <Link className="primary-button" href="/achul-nails">
          Ver demo publica
        </Link>
      </div>
    </main>
  );
}
