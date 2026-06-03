"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminWhatsAppConversation } from "@/lib/admin/whatsapp-operations-service";

type Props = {
  conversations: AdminWhatsAppConversation[];
};

export function AdminWhatsAppPanel({ conversations }: Props) {
  const router = useRouter();
  const [expandedPhone, setExpandedPhone] = useState<string | null>(null);
  const [resettingPhone, setResettingPhone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successPhone, setSuccessPhone] = useState<string | null>(null);

  async function resetConversation(phone: string) {
    setError(null);
    setSuccessPhone(null);
    setResettingPhone(phone);

    const token = readAdminToken();
    const response = await fetch("/api/admin/whatsapp/conversations/reset", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ phone })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "No se pudo reiniciar el chat");
      setResettingPhone(null);
      return;
    }

    setSuccessPhone(phone);
    setResettingPhone(null);
    router.refresh();
  }

  if (conversations.length === 0) {
    return (
      <div className="admin-list">
        <div className="admin-list-item">
          <div>
            <h2>No hay conversaciones de WhatsApp</h2>
            <p>Cuando una clienta escriba al bot, su chat va a aparecer acá.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-list admin-whatsapp-list">
      {error ? (
        <div className="admin-whatsapp-notice">
          <p className="admin-error">{error}</p>
        </div>
      ) : null}
      {conversations.map((conversation) => {
        const expanded = expandedPhone === conversation.phone;
        return (
          <article className="admin-list-item admin-whatsapp-item" key={conversation.id}>
            <div className="admin-whatsapp-summary">
              <div>
                <h2>{conversation.phone}</h2>
                <p>
                  <span className={`admin-status ${conversation.isExpired ? "" : "active"}`}>
                    {conversation.stateLabel}
                  </span>
                  <span className="admin-whatsapp-meta">Actualizado {formatDateTime(conversation.updatedAt)}</span>
                </p>
                <p>
                  Último mensaje: <strong>{conversation.lastMessage ?? "Sin mensaje"}</strong>
                </p>
                <p>
                  Vence: {formatDateTime(conversation.expiresAt)} · Mensajes procesados:{" "}
                  <strong>{conversation.processedMessagesCount}</strong>
                </p>
                <p>
                  Acción sugerida: <strong>{conversation.suggestedAction}</strong>
                </p>
                {conversation.isExpired ? (
                  <p className="admin-error">Conversación vencida: conviene reiniciar o pedir que escriba hola.</p>
                ) : null}
                {successPhone === conversation.phone ? (
                  <p className="admin-success">Chat reiniciado. La próxima respuesta vuelve al inicio.</p>
                ) : null}
              </div>
              <div className="admin-row-actions">
                <button type="button" onClick={() => setExpandedPhone(expanded ? null : conversation.phone)}>
                  {expanded ? "Ocultar detalle" : "Ver detalle"}
                </button>
                <button
                  type="button"
                  disabled={resettingPhone === conversation.phone}
                  onClick={() => resetConversation(conversation.phone)}
                >
                  {resettingPhone === conversation.phone ? "Reiniciando..." : "Reiniciar"}
                </button>
              </div>
            </div>

            {expanded ? <ConversationContextDetail conversation={conversation} /> : null}
          </article>
        );
      })}
    </div>
  );
}

function ConversationContextDetail({ conversation }: { conversation: AdminWhatsAppConversation }) {
  const rows = useMemo(
    () => [
      ["Servicios elegidos", formatList(conversation.displayContext.serviceNames)],
      ["Profesional", conversation.displayContext.professionalName],
      ["Día seleccionado", conversation.displayContext.selectedDayLabel],
      ["Horario", conversation.displayContext.selectedTimeLabel],
      ["Nombre", conversation.displayContext.fullName],
      ["Email", conversation.displayContext.email],
      ["Estado", conversation.stateLabel],
      ["Vencimiento", formatDateTime(conversation.expiresAt)]
    ],
    [conversation]
  );

  return (
    <div className="admin-whatsapp-detail">
      <h3>Detalle operativo</h3>
      <div className="admin-context-grid">
        {rows.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value || "Sin dato"}</strong>
          </div>
        ))}
      </div>
      <p className="muted">
        Reiniciar el chat solo limpia el estado conversacional. No cancela turnos, pagos ni clientes ya creados.
      </p>
    </div>
  );
}

function readAdminToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem("ADMIN_API_KEY") || readCookie("admin_api_key");
}

function readCookie(name: string) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires"
  }).format(date);
}

function formatList(value?: string[]) {
  return Array.isArray(value) && value.length > 0 ? value.join(", ") : undefined;
}
