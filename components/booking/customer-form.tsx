import React from "react";

export type SubmitState = "idle" | "submitting" | "redirecting";

export type CustomerFormFields = {
  fullName: string;
  phone: string;
  email: string;
};

export function CustomerForm({
  disabled,
  error,
  onSubmit,
  submitState
}: {
  disabled: boolean;
  error: string | null;
  onSubmit: (customer: CustomerFormFields) => Promise<void>;
  submitState: SubmitState;
}) {
  async function submitCustomer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await onSubmit({
      fullName: String(form.get("fullName") ?? ""),
      phone: String(form.get("phone") ?? ""),
      email: String(form.get("email") ?? "")
    });
  }

  return (
    <form className="booking-section customer-section" onSubmit={submitCustomer}>
      <div className="section-label">
        <span className="section-number">04</span>
        <h3>Tus datos</h3>
      </div>

      <div className="field-grid">
        <label className="field">
          <span>Nombre completo</span>
          <input autoComplete="name" name="fullName" placeholder="Ana Pérez" required />
        </label>
        <label className="field">
          <span>WhatsApp</span>
          <input autoComplete="tel" name="phone" placeholder="+54 9..." required />
        </label>
        <label className="field">
          <span>Email</span>
          <input autoComplete="email" name="email" placeholder="ana@email.com" required type="email" />
        </label>
      </div>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <button className="primary-button" disabled={disabled || submitState !== "idle"} type="submit">
        {submitState === "redirecting"
          ? "Redirigiendo a Mercado Pago"
          : submitState === "submitting"
            ? "Preparando seña"
            : "Continuar a Mercado Pago"}
      </button>
      <p className="fine-print">
        El turno se confirma cuando Mercado Pago aprueba la seña. Si el pago expira o falla, el
        horario vuelve a estar disponible.
      </p>
    </form>
  );
}
