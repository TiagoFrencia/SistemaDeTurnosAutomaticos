export function resolveMercadoPagoAccessToken(
  credentialKey: string,
  env: Record<string, string | undefined> = process.env
): string {
  const normalizedKey = credentialKey.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
  const envName = `MERCADOPAGO_ACCESS_TOKEN_${normalizedKey}`;
  const token = env[envName];

  if (!token) {
    throw new Error(`Missing Mercado Pago access token for credential key ${normalizedKey}`);
  }

  return token;
}
