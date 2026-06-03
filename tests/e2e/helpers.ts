import { createClient } from "@supabase/supabase-js";
import { expect, type Page, type TestInfo } from "@playwright/test";

export type E2ECustomer = {
  fullName: string;
  phone: string;
  email: string;
};

export function customerFor(testInfo: TestInfo, label: string): E2ECustomer {
  const suffix = Math.abs(hash(`${testInfo.project.name}-${label}`)).toString().slice(0, 6).padEnd(6, "0");
  return {
    fullName: `E2E ${label} ${testInfo.project.name}`,
    phone: `+549110${suffix}`,
    email: `e2e-${label}-${testInfo.project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}@example.com`
  };
}

export async function loginAdmin(page: Page) {
  const email = process.env.E2E_ADMIN_EMAIL || process.env.ACHUL_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD || process.env.ACHUL_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "E2E admin login requires E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD or ACHUL_ADMIN_EMAIL/ACHUL_ADMIN_PASSWORD"
    );
  }

  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/Contrasena|Contraseña/i).fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin(?:\?.*)?$/);
}

export async function attachScreenshot(page: Page, testInfo: TestInfo, name: string) {
  await testInfo.attach(name, {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png"
  });
}

export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const documentOverflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    const bodyOverflow = document.body.scrollWidth - document.body.clientWidth;
    const offenders = Array.from(document.querySelectorAll<HTMLElement>("body *"))
      .filter((element) => element.scrollWidth - element.clientWidth > 2)
      .slice(0, 5)
      .map((element) => ({
        tag: element.tagName,
        className: element.className,
        text: element.textContent?.trim().slice(0, 80)
      }));

    return { documentOverflow, bodyOverflow, offenders };
  });

  expect(overflow, `Horizontal overflow: ${JSON.stringify(overflow)}`).toMatchObject({
    documentOverflow: expect.any(Number),
    bodyOverflow: expect.any(Number)
  });
  expect(overflow.documentOverflow).toBeLessThanOrEqual(2);
  expect(overflow.bodyOverflow).toBeLessThanOrEqual(2);
}

export async function cleanupE2ECustomer(customer: E2ECustomer) {
  const supabase = supabaseAdmin();

  const { data: customers, error: customerError } = await supabase
    .from("customers")
    .select("id")
    .or(`phone.eq.${customer.phone},email.eq.${customer.email}`);
  if (customerError) throw customerError;

  const customerIds = (customers ?? []).map((row) => row.id);
  if (customerIds.length === 0) return;

  const { data: appointments, error: appointmentError } = await supabase
    .from("appointments")
    .select("id")
    .in("customer_id", customerIds);
  if (appointmentError) throw appointmentError;

  const appointmentIds = (appointments ?? []).map((row) => row.id);
  if (appointmentIds.length > 0) {
    await throwOnError(supabase.from("appointment_services").delete().in("appointment_id", appointmentIds));
    await throwOnError(supabase.from("payments").delete().in("appointment_id", appointmentIds));
    await throwOnError(supabase.from("notifications").delete().in("appointment_id", appointmentIds));
    await throwOnError(supabase.from("appointments").delete().in("id", appointmentIds));
  }

  await throwOnError(supabase.from("customers").delete().in("id", customerIds));
}

export async function cleanupE2EWhatsAppPhone(phone: string) {
  const supabase = supabaseAdmin();
  const normalized = phone.replace(/^\+/, "");
  await throwOnError(supabase.from("whatsapp_processed_messages").delete().eq("phone", normalized));
  await throwOnError(supabase.from("whatsapp_conversations").delete().eq("phone", normalized));
}

export async function firstActiveAgendaItems() {
  const supabase = supabaseAdmin();
  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("id")
    .eq("slug", "achul-nails")
    .maybeSingle();
  if (businessError) throw businessError;
  if (!business?.id) throw new Error("Missing achul-nails business seed");

  const [{ data: services, error: serviceError }, { data: professionals, error: professionalError }] =
    await Promise.all([
      supabase.from("services").select("id,name").eq("business_id", business.id).eq("active", true).limit(2),
      supabase.from("professionals").select("id,name").eq("business_id", business.id).eq("active", true).limit(1)
    ]);
  if (serviceError) throw serviceError;
  if (professionalError) throw professionalError;
  if (!services?.length || !professionals?.length) {
    throw new Error("E2E requires active Achul_Nails services and professionals");
  }

  return { serviceIds: services.map((service) => service.id), professionalId: professionals[0].id };
}

export function futureLocalDateTime(daysAhead: number, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  date.setHours(18, minute, 0, 0);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function supabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("E2E requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });
}

async function throwOnError(query: PromiseLike<{ error: unknown }>) {
  const { error } = await query;
  if (error && !(typeof error === "object" && "code" in error && error.code === "42P01")) {
    throw error;
  }
}

function hash(value: string) {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result << 5) - result + value.charCodeAt(index);
    result |= 0;
  }
  return result;
}
