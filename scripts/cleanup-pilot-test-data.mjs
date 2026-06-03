import { createClient } from "@supabase/supabase-js";

const args = new Map(
  process.argv
    .slice(2)
    .filter((arg) => arg.startsWith("--"))
    .map((arg) => {
      const [key, ...valueParts] = arg.slice(2).split("=");
      return [key, valueParts.join("=") || "true"];
    })
);

const dryRun = args.get("execute") !== "true";
const emails = csv(args.get("emails"));
const phones = csv(args.get("phones"));

if (emails.length === 0 && phones.length === 0) {
  console.error("Uso: node scripts/cleanup-pilot-test-data.mjs --emails=a@test.com --phones=+549... [--execute=true]");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const customersQuery = supabase.from("customers").select("id,email,phone,full_name");
const filters = [];
if (emails.length) filters.push(`email.in.(${emails.map(escapeFilter).join(",")})`);
if (phones.length) filters.push(`phone.in.(${phones.map(escapeFilter).join(",")})`);
const { data: customers, error: customerError } = await customersQuery.or(filters.join(","));
if (customerError) throw customerError;

const customerIds = (customers ?? []).map((customer) => customer.id);
const { data: appointments, error: appointmentError } = customerIds.length
  ? await supabase.from("appointments").select("id,customer_id,status,start_at").in("customer_id", customerIds)
  : { data: [], error: null };
if (appointmentError) throw appointmentError;

const appointmentIds = (appointments ?? []).map((appointment) => appointment.id);
console.log(
  JSON.stringify(
    {
      mode: dryRun ? "dry-run" : "execute",
      customers: customers ?? [],
      appointments: appointments ?? [],
      appointmentIds
    },
    null,
    2
  )
);

if (dryRun || customerIds.length === 0) {
  process.exit(0);
}

if (appointmentIds.length) {
  await must(supabase.from("payments").delete().in("appointment_id", appointmentIds));
  await must(supabase.from("notifications").delete().in("appointment_id", appointmentIds));
  await must(supabase.from("appointment_services").delete().in("appointment_id", appointmentIds));
  await must(supabase.from("appointments").delete().in("id", appointmentIds));
}
await must(supabase.from("customers").delete().in("id", customerIds));

console.log("Datos de prueba eliminados.");

function csv(value) {
  return value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function escapeFilter(value) {
  return `"${value.replaceAll('"', '\\"')}"`;
}

async function must(query) {
  const { error } = await query;
  if (error) throw error;
}
