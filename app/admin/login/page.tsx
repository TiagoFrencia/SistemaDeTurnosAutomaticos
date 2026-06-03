import React, { Suspense } from "react";
import { AdminLoginForm } from "@/components/admin/admin-login-form";

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  return (
    <section className="admin-panel admin-login-panel" aria-labelledby="login-title">
      <div className="admin-login-card">
        <div className="admin-login-brand">
          <span>Achul_Nails</span>
          <strong>Panel admin</strong>
        </div>
        <div>
          <p className="admin-kicker">Admin</p>
          <h1 id="login-title">Entrar al panel</h1>
          <p className="muted">Gestioná turnos, pagos y WhatsApp desde un solo lugar.</p>
        </div>
        <Suspense fallback={<p className="muted">Cargando login...</p>}>
          <AdminLoginForm />
        </Suspense>
      </div>
    </section>
  );
}
