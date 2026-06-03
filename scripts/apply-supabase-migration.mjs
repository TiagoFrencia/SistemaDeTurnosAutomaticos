import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, ...value] = arg.replace(/^--/, "").split("=");
    return [key, value.join("=") || "true"];
  })
);

const migrationFile = args.file;
const execute = args.execute === "true";
const projectRef = process.env.SUPABASE_PROJECT_REF ?? "qerjqgybyjvcoxqnjybw";
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

if (!migrationFile) {
  console.error("Missing --file=<migration-file.sql>");
  process.exit(1);
}

if (!/^\d{3}_[\w-]+\.sql$/.test(migrationFile)) {
  console.error("Use an exact migration filename, for example --file=009_pre_pilot_admin_auth_expiry.sql");
  process.exit(1);
}

const migrationPath = resolve(process.cwd(), "supabase", "migrations", basename(migrationFile));
const query = await readFile(migrationPath, "utf8");

if (!execute) {
  console.log(`Dry-run: ${migrationFile}`);
  console.log("Pass --execute=true to apply this migration to Supabase Cloud.");
  console.log(query);
  process.exit(0);
}

if (!accessToken) {
  console.error("Missing SUPABASE_ACCESS_TOKEN. Create a Supabase Management API token with database:write.");
  process.exit(1);
}

const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ query, read_only: false })
});

const text = await response.text();

if (!response.ok) {
  throw new Error(`${migrationFile} failed with ${response.status}: ${text}`);
}

console.log(`${migrationFile}: ok`);
if (text) {
  console.log(text);
}
