import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

loadEnvFile(".env.local");

const token = process.env.MERCADOPAGO_ACCESS_TOKEN_ACHUL;

if (!token) {
  console.error("Falta MERCADOPAGO_ACCESS_TOKEN_ACHUL en el entorno.");
  process.exit(1);
}

const response = await fetch("https://api.mercadopago.com/v1/payment_methods", {
  headers: {
    Authorization: `Bearer ${token}`
  }
});

if (!response.ok) {
  const body = await response.text();
  console.error(`Mercado Pago respondio ${response.status}: ${body}`);
  process.exit(1);
}

const methods = await response.json();
const summary = methods.map((method) => ({
  id: method.id,
  name: method.name,
  type: method.payment_type_id,
  status: method.status
}));
const accountMoney = summary.find((method) => method.id === "account_money");

console.log("Metodos disponibles para la cuenta/país configurados:");
console.table(summary);
console.log(
  accountMoney
    ? "account_money aparece disponible por API. Si no se ve en Checkout Pro, validar sesion/saldo de la cuenta compradora."
    : "account_money no aparece en /v1/payment_methods para esta credencial."
);

function loadEnvFile(fileName) {
  const envPath = resolve(process.cwd(), fileName);
  if (!existsSync(envPath)) {
    return;
  }

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed
      .slice(separator + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}
