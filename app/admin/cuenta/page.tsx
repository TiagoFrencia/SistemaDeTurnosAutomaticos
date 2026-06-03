import { AdminAccountForm } from "@/components/admin/admin-account-form";
import { requireAdminPageAccess } from "@/lib/admin/admin-auth";
import { createSupabaseAuthServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminCuentaPage() {
  await requireAdminPageAccess("achul-nails");
  const supabase = createSupabaseAuthServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return (
    <section className="admin-page-section" aria-labelledby="admin-account-title">
      <p className="admin-kicker">Cuenta</p>
      <h1 id="admin-account-title">Acceso del panel</h1>
      <p className="admin-subtitle">Cambiá el email o la contraseña de la administradora.</p>
      <AdminAccountForm currentEmail={user?.email ?? ""} />
    </section>
  );
}
