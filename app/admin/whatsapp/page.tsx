import { AdminWhatsAppPanel } from "@/components/admin/admin-whatsapp-panel";
import { requireAdminPageAccess } from "@/lib/admin/admin-auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import {
  listAdminWhatsAppConversations,
  stateLabel,
  type AdminWhatsAppConversationState
} from "@/lib/admin/whatsapp-operations-service";
import { SupabaseAdminWhatsAppRepository } from "@/lib/admin/supabase-whatsapp-operations-repository";

type Props = {
  searchParams?: { [key: string]: string | undefined };
};

const BUSINESS_SLUG = "achul-nails";
const STATES: AdminWhatsAppConversationState[] = [
  "greeting",
  "selecting_services",
  "selecting_professional",
  "selecting_day",
  "selecting_slot",
  "collecting_name",
  "collecting_email",
  "confirming_booking",
  "completed"
];

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: Props) {
  await requireAdminPageAccess(BUSINESS_SLUG);
  const phone = searchParams?.phone?.trim() || undefined;
  const state = searchParams?.state || undefined;
  const repository = new SupabaseAdminWhatsAppRepository(createSupabaseServiceClient());
  const conversations = await listAdminWhatsAppConversations({
    repository,
    businessSlug: BUSINESS_SLUG,
    phone,
    state,
    limit: 50
  });

  return (
    <section className="admin-panel" aria-labelledby="whatsapp-title">
      <div className="admin-panel-heading">
        <div>
          <p className="admin-kicker">WhatsApp</p>
          <h1 id="whatsapp-title">Operacion WhatsApp</h1>
          <p className="muted">Revisa chats recientes, detecta pasos trabados y reinicia conversaciones sin tocar turnos.</p>
        </div>
      </div>

      <form className="admin-form" method="get">
        <div className="admin-form-grid">
          <label>
            Telefono
            <input name="phone" defaultValue={phone ?? ""} placeholder="+549..." />
          </label>
          <label>
            Estado
            <select name="state" defaultValue={state ?? ""}>
              <option value="">Todos</option>
              {STATES.map((option) => (
                <option key={option} value={option}>
                  {stateLabel(option)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="admin-filter-actions">
          <button className="admin-primary-button">Filtrar</button>
          <a className="admin-link" href="/admin/whatsapp">
            Limpiar
          </a>
        </div>
      </form>

      <AdminWhatsAppPanel conversations={conversations} />
    </section>
  );
}
