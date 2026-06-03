import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const projectRef = process.env.SUPABASE_PROJECT_REF ?? "qerjqgybyjvcoxqnjybw";
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

if (!accessToken) {
  console.error("Missing SUPABASE_ACCESS_TOKEN. Create a Supabase Management API token with database:write.");
  process.exit(1);
}

const root = process.cwd();
const migrationSql = await readFile(
  resolve(root, "supabase/migrations/001_mvp_anti_inasistencias.sql"),
  "utf8"
);
const seedSql = await readFile(resolve(root, "supabase/seed.sql"), "utf8");

await runSql("migration 001_mvp_anti_inasistencias", migrationSql);
await runSql("seed Achul_Nails", seedSql);

const verification = await runSql(
  "verification",
  `
  select b.name, b.slug, p.name as professional, s.name as service, s.price_amount, s.deposit_value
  from businesses b
  join professionals p on p.business_id = b.id
  join services s on s.business_id = b.id
  where b.slug = 'achul-nails';
  `,
  true
);

console.log(JSON.stringify(verification, null, 2));

async function runSql(label, query, readOnly = false) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query, read_only: readOnly })
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`${label} failed with ${response.status}: ${text}`);
  }

  console.log(`${label}: ok`);
  return text ? JSON.parse(text) : null;
}
