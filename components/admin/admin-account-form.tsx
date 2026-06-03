"use client";

import React from "react";
import { useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type AdminAccountFormProps = {
  currentEmail: string;
};

export function AdminAccountForm({ currentEmail }: AdminAccountFormProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [email, setEmail] = useState(currentEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submittingEmail, setSubmittingEmail] = useState(false);
  const [submittingPassword, setSubmittingPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function updateEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittingEmail(true);
    setMessage(null);
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || normalizedEmail === currentEmail.toLowerCase()) {
      setError("Escribí un email nuevo para guardar el cambio.");
      setSubmittingEmail(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ email: normalizedEmail });
    if (updateError) {
      setError("No se pudo cambiar el email. Revisá que sea válido y volvé a intentar.");
      setSubmittingEmail(false);
      return;
    }

    setMessage("Cambio de email iniciado. Si Supabase pide confirmación, revisá el correo nuevo.");
    setSubmittingEmail(false);
  }

  async function updatePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittingPassword(true);
    setMessage(null);
    setError(null);

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      setSubmittingPassword(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      setSubmittingPassword(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError("No se pudo cambiar la contraseña. Volvé a iniciar sesión y probá de nuevo.");
      setSubmittingPassword(false);
      return;
    }

    setPassword("");
    setConfirmPassword("");
    setMessage("Contraseña actualizada.");
    setSubmittingPassword(false);
  }

  return (
    <div className="admin-account-grid">
      <form className="admin-form" onSubmit={updateEmail}>
        <div>
          <h2>Email de acceso</h2>
          <p className="admin-muted">Este email se usa para entrar al panel admin.</p>
        </div>
        <label>
          Email
          <input
            autoComplete="email"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <button className="admin-primary-button" disabled={submittingEmail}>
          {submittingEmail ? "Guardando..." : "Cambiar email"}
        </button>
      </form>

      <form className="admin-form" onSubmit={updatePassword}>
        <div>
          <h2>Contraseña</h2>
          <p className="admin-muted">Usá una contraseña que solo conozca la administradora.</p>
        </div>
        <label>
          Nueva contraseña
          <input
            autoComplete="new-password"
            minLength={8}
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>
        <label>
          Repetir contraseña
          <input
            autoComplete="new-password"
            minLength={8}
            name="confirmPassword"
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            type="password"
            value={confirmPassword}
          />
        </label>
        <button className="admin-primary-button" disabled={submittingPassword}>
          {submittingPassword ? "Guardando..." : "Cambiar contraseña"}
        </button>
      </form>

      <div className="admin-account-feedback" aria-live="polite">
        {message ? <p className="admin-success">{message}</p> : null}
        {error ? <p className="admin-error">{error}</p> : null}
      </div>
    </div>
  );
}
