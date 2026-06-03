import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Turnos Estetica",
  description: "Agenda con sena para reducir inasistencias"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <body>{children}</body>
    </html>
  );
}
