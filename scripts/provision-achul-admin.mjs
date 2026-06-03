import { createClient } from "@supabase/supabase-js";

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, ...value] = arg.replace(/^--/, "").split("=");
    return [key, value.join("=") || "true"];
  })
);

const execute = args.execute === "true";
const email = process.env.ACHUL_ADMIN_EMAIL ?? args.email;
const password = process.env.ACHUL_ADMIN_PASSWORD ?? args.password;
const businessSlug = process.env.WHATSAPP_BUSINESS_SLUG ?? "achul-nails";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!email || !password) {
  console.error("Missing admin credentials. Use --email=... --password=... or ACHUL_ADMIN_EMAIL / ACHUL_ADMIN_PASSWORD.");
  process.exit(1);
}

if (password.length < 8) {
  console.error("Admin password must be at least 8 characters.");
  process.exit(1);
}

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const { data: business, error: businessError } = await supabase
  .from("businesses")
  .select("id, slug")
  .eq("slug", businessSlug)
  .maybeSingle();

if (businessError || !business) {
  throw new Error(`Business not found for slug ${businessSlug}: ${businessError?.message ?? "missing row"}`);
}

const existingUser = await findUserByEmail(email);

if (!execute) {
  console.log(
    JSON.stringify(
      {
        dryRun: true,
        businessSlug,
        email,
        userExists: Boolean(existingUser),
        actions: existingUser
          ? ["upsert business_admins membership"]
          : ["create confirmed Supabase Auth user", "upsert business_admins membership"]
      },
      null,
      2
    )
  );
  process.exit(0);
}

const user = existingUser ?? (await createAdminUser(email, password));

const { error: membershipError } = await supabase.from("business_admins").upsert(
  {
    business_id: business.id,
    user_id: user.id,
    role: "owner",
    active: true,
    updated_at: new Date().toISOString()
  },
  { onConflict: "business_id,user_id" }
);

if (membershipError) {
  throw membershipError;
}

console.log(
  JSON.stringify(
    {
      ok: true,
      businessSlug,
      email,
      userId: user.id,
      role: "owner"
    },
    null,
    2
  )
);

async function findUserByEmail(targetEmail) {
  let page = 1;

  while (page < 20) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (error) {
      throw error;
    }

    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === targetEmail.toLowerCase());
    if (user) {
      return user;
    }

    if (data.users.length < 100) {
      return null;
    }

    page += 1;
  }

  throw new Error("Too many Supabase users to search safely. Create the user manually and rerun the script.");
}

async function createAdminUser(targetEmail, targetPassword) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: targetEmail,
    password: targetPassword,
    email_confirm: true
  });

  if (error || !data.user) {
    throw error ?? new Error("Supabase did not return a created user.");
  }

  return data.user;
}
