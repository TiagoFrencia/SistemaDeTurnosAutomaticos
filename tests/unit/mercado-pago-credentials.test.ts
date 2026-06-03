import { describe, expect, it } from "vitest";
import { resolveMercadoPagoAccessToken } from "@/lib/payments/mercado-pago-credentials";

describe("MercadoPagoCredentialResolver", () => {
  it("resolves pilot business access tokens from environment keys", () => {
    const token = resolveMercadoPagoAccessToken("ACHUL", {
      MERCADOPAGO_ACCESS_TOKEN_ACHUL: "token-achul"
    });

    expect(token).toBe("token-achul");
  });

  it("throws a clear error when a pilot credential is missing", () => {
    expect(() => resolveMercadoPagoAccessToken("ACHUL", {})).toThrow(
      "Missing Mercado Pago access token for credential key ACHUL"
    );
  });
});
