# Handoff: MVP Anti-Inasistencias

## Current Status

- Branch: `001-mvp-anti-inasistencias`.
- Stack: Next.js 14 App Router, TypeScript, Supabase Cloud, Mercado Pago Checkout Pro, Resend, Vercel-ready.
- Supabase Cloud project `rossetti-turnos` was migrated to the MVP schema with `businesses`, `professionals`, `services`, `business_hours`, `availability_blocks`, `customers`, `appointments`, `payments`, and `notifications`.
- Legacy Cloud tables were preserved by the migration as `legacy_*` when the MVP schema did not already exist.
- Seed data for `Achul_Nails` is applied:
  - slug: `achul-nails`
  - professional: `Azul`
  - service: `Manicure semipermanente`
  - price: ARS 5000
  - deposit: ARS 1500
  - hours: Monday to Friday, 09:00 to 18:00.
- Public availability is live through `GET /api/public/businesses/achul-nails/availability`.
- Public booking UI is split into service/professional selection, grouped slot picker, and customer form components, with an open warm editorial design.
- Public booking now uses a 30-day availability window and supports selecting multiple services in one consecutive appointment with the same professional. Totals, duration, deposit, checkout amount, and admin display are calculated from the selected services.
- Public booking UI posts to `POST /api/bookings`.
- `POST /api/bookings` creates a `pending_payment` hold before checkout and now creates a real Mercado Pago Checkout Pro preference when `MERCADOPAGO_ACCESS_TOKEN_ACHUL` is configured.
- `POST /api/mercado-pago/webhook` now processes Mercado Pago payment notifications and the internal test payload shape.
- Approved payment webhooks move appointments to `confirmed`, update the linked payment to `approved`, and dispatch `booking.confirmed` through `NotificationService`.
- Rejected, cancelled, and expired payment webhooks move appointments to non-blocking failed/expired states so the slot is released.
- US2 admin agenda configuration is implemented for the Achul pilot at `/admin`: services, professionals, weekly hours, and availability blocks use service-role server access with `businessSlug=achul-nails` as the pilot default.
- Admin endpoints are live for services, professionals, business hours, and availability blocks. Responses are normalized to camelCase for the admin UI.
- Anti-double-booking was smoke-tested: a second booking attempt for the same slot returned `409`.
- The smoke hold created during verification was removed, so Azul's first test slot is not blocked.
- Mercado Pago MCP was added to local Codex config at `C:\Users\tiago\.codex\config.toml`; restart/open a new Codex session for it to appear as a callable MCP.

## Current Blocker

- No blocker for US1 payment confirmation remains locally: `MERCADOPAGO_ACCESS_TOKEN_ACHUL` is present in `.env.local` and Checkout Pro preference creation was smoke-tested successfully.
- `RESEND_API_KEY` is still empty locally, so webhook smoke tests record `booking.confirmed` notification attempts as `failed` unless a Resend key is configured.

## Verified Commands

These passed after the Supabase Cloud migration and seed:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Latest observed full-suite result: `npm test` passed with 18 test files and 36 tests.
Latest verification after US2 admin implementation: `npm run typecheck`, `npm run lint`, and `npm run build` passed.
Visual verification for `/achul-nails` was completed on desktop and mobile. Desktop no longer has `Achul_Nails` overlapping the booking panel, no horizontal overflow was detected, grouped slots and selector controls are readable, and the Mercado Pago CTA is reachable in the normal scroll flow. Mobile verification also showed no horizontal overflow or clipping, with the CTA visible in the scrolled customer-form viewport.
Latest observed US2 focused result: admin endpoint, admin agenda integration, admin block integration, and admin component tests passed with 6 files and 10 tests.
Latest E2E smoke result: `npm run test:e2e` passed for customer booking, fake checkout, approved webhook, and admin appointment visibility.
Phase 2 design notes are now documented in `docs/mercado-pago-oauth-phase-2.md` and `docs/notifications-phase-2.md`; WhatsApp automation has since moved from notes to an MVP runtime implementation behind env vars.
WhatsApp Automation MVP is documented in `docs/whatsapp-automation.md`. Local/E2E should use `WHATSAPP_PROVIDER=fake`; production recommended path is Meta Cloud API direct with `WHATSAPP_PROVIDER=meta`.
New WhatsApp surfaces:

- `GET/POST /api/whatsapp/webhook`
- `GET /api/jobs/appointment-reminders` protected by `CRON_SECRET`
- `whatsapp_conversations`
- `whatsapp_processed_messages` for Meta retry/idempotency control

Final local demo closure completed on 2026-05-30: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and `npm run test:e2e` all passed. Latest full-suite result is 23 Vitest files / 55 tests plus 1 Playwright smoke test. This closes T056/T057 for local demo readiness.

WhatsApp production-stability update on 2026-06-01: the Cloud project now has `whatsapp_processed_messages` with RLS enabled, and `POST /api/whatsapp/webhook` deduplicates Meta `message.id` retries. Conversation state is persisted only after the reply is sent successfully, so a failed Meta response does not silently advance the booking flow.

WhatsApp admin operations update on 2026-06-02: `/admin/whatsapp` is live in production behind `ADMIN_API_KEY`. It lists recent conversations, shows state, last message, expiration, processed message count, a human-readable operational detail, and a suggested action. The safe reset action sets the chat back to `greeting` without touching appointments, payments, customers, or processed-message idempotency rows.

Pilot preparation update on 2026-06-02: the controlled real-use pilot for Achul_Nails is documented in `docs/piloto-achul-nails.md`. It defines the 7-14 day rollout, Dia 0 tests, daily admin routine, issue log, success criteria, and limits for using real Mercado Pago deposits with trusted clients.

Pre-pilot hardening update on 2026-06-02: admin login has moved to Supabase Auth with `business_admins` as the business membership table. `ADMIN_API_KEY` is now only a local/test fallback when `ALLOW_ADMIN_API_KEY_FALLBACK=true`. The admin home page is a simple daily dashboard, manual appointments support multiple services, appointment details include safe rescheduling, and abandoned `pending_payment` holds expire after 30 minutes when availability is consulted. `/api/jobs/expire-pending-payments` remains available for scheduled cleanup.

Pre-pilot audit update on 2026-06-02: `docs/pre-pilot-audit-report.md` records the full local audit. Playwright now covers desktop and mobile for the public booking page, admin login, dashboard, turnos, WhatsApp, agenda, services, professionals, personalization, and account pages. The E2E suite also covers public booking with fake checkout, WhatsApp guided booking, admin manual appointments, attendance marking, cron protection, admin login protection, and WhatsApp verify-token behavior. Latest local result: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and `npm run test:e2e` all passed. Playwright intentionally runs with `workers: 1` because `next dev` produced HMR/Fast Refresh instability under parallel desktop/mobile E2E.

Pre-pilot production deploy on 2026-06-02: Vercel Production deployment `dpl_9jw2bKfyykLFd917bqXd6urHDqoG` was promoted and aliased to `https://turnos-estetica.vercel.app`. Smoke after deploy returned `/` `200`, `/achul-nails` `200`, `/admin` `307` without session, `/admin/login` `200`, `/admin/turnos` `307` without session, `/api/jobs/expire-pending-payments` `401` without token, and WhatsApp webhook verify with a wrong token `403`. `ALLOW_ADMIN_API_KEY_FALLBACK` is not configured in Vercel Production.

Supabase Cloud migration `009_pre_pilot_admin_auth_expiry.sql` was applied on 2026-06-02. The Achul_Nails admin user `tiagoofrenciaa@gmail.com` was provisioned and linked as `owner` in `business_admins`. Login was verified with Supabase Auth.

Admin account management update on 2026-06-02: `/admin/cuenta` lets the logged-in admin change the account email and password from inside the app.

Vercel stable deployment completed on 2026-06-01:

- Production URL: `https://turnos-estetica.vercel.app`
- Latest deployment id: `dpl_4YG8YLcJ7FbByEagZib5uQ2Phjiz`
- Project: `tiagofrencias-projects/turnos-estetica`
- WhatsApp callback URL: `https://turnos-estetica.vercel.app/api/whatsapp/webhook`
- Mercado Pago webhook URL: `https://turnos-estetica.vercel.app/api/mercado-pago/webhook`
- `NEXT_PUBLIC_APP_URL` is configured in Vercel Production as `https://turnos-estetica.vercel.app`.

Production smoke after deploy returned `200` for `/`, `/achul-nails`, `/admin/turnos`, the public availability API with a valid date window, authorized reminders, and Meta webhook verification. Unauthorized reminders correctly returned `401`.

Latest production smoke after pre-pilot hardening returned:

- `/`: `200`
- `/achul-nails`: `200`
- `/admin/login`: `200`
- `/admin/turnos`: `307` to login without session
- `/admin/cuenta`: `307` to login without session
- public availability API: `200`
- `/api/jobs/expire-pending-payments`: `401` without token and `{"scanned":0,"expired":0}` with `CRON_SECRET`

Quickstart scenario coverage for the local demo:

- Scenario 1 is covered by `tests/e2e/customer-booking-smoke.spec.ts`: public booking, fake checkout, approved webhook, admin visibility, and occupied slot.
- Scenario 2 is covered by `tests/integration/customer-booking-payment-failed.test.ts`.
- Scenario 3 is covered by `tests/integration/admin-blocks-availability.test.ts`.
- Scenario 4 is covered by `tests/integration/admin-manual-appointment.test.ts`.
- Scenario 5 is covered by `tests/integration/admin-appointment-status.test.ts`.
- Scenario 6 is covered by `tests/contract/notifications.contract.test.ts`.

Local demo limits: real Resend delivery, real Mercado Pago webhook delivery, and ngrok public callbacks remain external/manual validations. The local E2E intentionally uses `E2E_TEST_MODE=true` and the fake checkout route.

## Cloud Verification

Smoke query used after applying the seed:

```sql
select b.name, b.slug, p.name as professional, s.name as service, s.price_amount, s.deposit_value
from businesses b
join professionals p on p.business_id = b.id
join services s on s.business_id = b.id
where b.slug = 'achul-nails';
```

Expected row:

```text
Achul_Nails | achul-nails | Azul | Manicure semipermanente | 5000 | 1500
```

Availability smoke:

```bash
GET /api/public/businesses/achul-nails/availability?from=2026-06-01T00:00:00-03:00&to=2026-06-08T00:00:00-03:00
```

Expected result:

- HTTP `200`
- business `Achul_Nails`
- professional `Azul`
- service `Manicure semipermanente`
- `slots.length === 45`
- first slot `2026-06-01T09:00:00.000-03:00`

## Environment

Required local variables are documented in `.env.example`.

Important local-only variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ACCESS_TOKEN` for running `npm run supabase:apply-cloud`
- `MERCADOPAGO_ACCESS_TOKEN_ACHUL`
- `NGROK_PUBLIC_URL` for local webhook tests
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `ADMIN_API_KEY`
- `ALLOW_ADMIN_API_KEY_FALLBACK` for local/test API-key fallback only
- `E2E_TEST_MODE`
- `WHATSAPP_PROVIDER`
- `WHATSAPP_BUSINESS_SLUG`
- `META_WHATSAPP_PHONE_NUMBER_ID`
- `META_WHATSAPP_ACCESS_TOKEN`
- `META_WHATSAPP_VERIFY_TOKEN`
- `CRON_SECRET`

Never commit `.env.local` or real tokens. The `SUPABASE_SERVICE_ROLE_KEY` is required because MVP tables have RLS enabled and app access is currently server-side.

## Useful Commands

Apply the Cloud schema and seed when needed:

```bash
npm run supabase:apply-cloud
```

Apply one Cloud migration without rerunning the seed:

```bash
npm run supabase:apply-migration -- --file=009_pre_pilot_admin_auth_expiry.sql
npm run supabase:apply-migration -- --file=009_pre_pilot_admin_auth_expiry.sql --execute=true
```

Run local dev:

```bash
npm run dev
```

Run E2E smoke:

```bash
npm run test:e2e
```

The E2E smoke uses `E2E_TEST_MODE=true`, a fake checkout page, the configured Supabase Cloud project, and cleans only the `e2e-smoke@example.com` / `+5491100009999` customer data before and after the test.

Expose local webhook for Mercado Pago:

```bash
npm run dev:ngrok
```

See `docs/local-webhooks-ngrok.md` for webhook setup details.

Clean exact pilot test customers with dry-run first:

```bash
npm run pilot:cleanup -- --emails=e2e-smoke@example.com --phones=+5491100009999
npm run pilot:cleanup -- --emails=e2e-smoke@example.com --phones=+5491100009999 --execute=true
```

Provision the Achul_Nails admin user with dry-run first:

```bash
npm run pilot:provision-admin -- --email=admin@example.com --password="change-me-strong"
npm run pilot:provision-admin -- --email=admin@example.com --password="change-me-strong" --execute=true
```

## Next Recommended Implementation

1. Run one controlled real Mercado Pago booking with a small deposit and verify `pending_payment -> confirmed`.
2. Replace the Meta test number with a registered production WhatsApp number before inviting real clientas through WhatsApp.
3. Configure `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in Vercel Production with a verified sender/domain.
4. Clean exact E2E/test customers before handing the panel to the Achul_Nails admin.
4. Deploy the pre-pilot hardening changes to Vercel and verify the cron route is accepted by the current Vercel plan.
5. Run the Day 0 checklist in `docs/piloto-achul-nails.md`, then hand the short guide `docs/guia-admin-achul-nails.md` to your sister.
6. Implement Mercado Pago OAuth/connect onboarding so each business can connect its own account after the Achul_Nails pilot.
7. Extend WhatsApp operations with message history, client-side reprogramming/cancellation support, and admin-configurable bot copy when needed.

## Known Risks

- RLS is enabled; server-side service role access is required until proper public/admin policies are designed.
- Admin now uses Supabase Auth in code, but Cloud must have the migration, admin user, and `business_admins` membership row before production handoff.
- Real email delivery is blocked until `RESEND_API_KEY` and a verified `RESEND_FROM_EMAIL` are configured.
- Real WhatsApp production delivery requires a fixed HTTPS callback URL, a permanent Meta token, and a registered production phone number. The test number is enough for QA but not final production traffic.
- Vercel Hobby only allows daily cron. The app also expires abandoned holds when availability is requested; upgrade to Pro or use an external scheduler if strict every-10-minute background cleanup is needed.
- ngrok is required for local real webhook testing.
- Do not bypass `NotificationService`; WhatsApp confirmation/reminder sends must continue flowing through it.
