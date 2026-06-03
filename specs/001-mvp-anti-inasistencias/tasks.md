# Tasks: MVP Anti-Inasistencias

**Input**: Design documents from `specs/001-mvp-anti-inasistencias/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Required for payment state transitions, availability conflicts, notification abstraction, and the three MVP user stories.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Phase 1: Setup

**Purpose**: Create the application shell and shared project tooling.

- [x] T001 Create Next.js App Router project structure in `app/`, `components/`, `lib/`, `supabase/`, and `tests/`
- [x] T002 Add project manifest and scripts in `package.json`
- [x] T003 [P] Configure TypeScript in `tsconfig.json`
- [x] T004 [P] Configure linting and formatting in `eslint.config.mjs` and `.prettierrc`
- [x] T005 [P] Configure test runner in `vitest.config.ts` or equivalent
- [x] T006 Create environment template in `.env.example` with Supabase, Resend, app URL, and pilot Mercado Pago credential keys

---

## Phase 2: Foundational

**Purpose**: Build the shared data, service, and integration foundations required by every story.

**CRITICAL**: No user story work should begin until this phase is complete.

- [x] T007 Create Supabase schema migration for Business, Professional, Service, BusinessHours, AvailabilityBlock, Customer, Appointment, Payment, and Notification in `supabase/migrations/001_mvp_anti_inasistencias.sql`
- [x] T008 [P] Create typed domain models in `lib/domain/types.ts`
- [x] T009 [P] Create validation schemas in `lib/validation/schemas.ts`
- [x] T010 Implement Supabase server client helpers in `lib/supabase/server.ts`
- [x] T011 Implement availability overlap and slot calculation service in `lib/availability/availability-service.ts`
- [x] T012 Implement booking status transition helpers in `lib/booking/status.ts`
- [x] T013 Implement Mercado Pago credential resolver for manual pilot environment variables in `lib/payments/mercado-pago-credentials.ts`
- [x] T014 Implement Mercado Pago payment service interface in `lib/payments/payment-service.ts`
- [x] T015 Implement notification interfaces and registry in `lib/notifications/notification-service.ts`
- [x] T016 Implement Resend email adapter in `lib/notifications/email-adapter.ts`
- [x] T017 [P] Add contract tests for NotificationService channel abstraction in `tests/contract/notifications.contract.test.ts`
- [x] T018 [P] Add unit tests for availability conflict detection in `tests/unit/availability-service.test.ts`

**Checkpoint**: Foundation can calculate availability, resolve pilot credentials, call payment abstraction, and dispatch notifications through the shared interface.

---

## Phase 3: User Story 1 - Cliente reserva con sena (Priority: P1) MVP

**Goal**: Customer can book a public slot, pay a deposit, and receive confirmation only after approved payment.

**Independent Test**: Complete a booking from public URL, simulate approved webhook, verify confirmed appointment, occupied slot, and email notification.

**Current State (2026-05-28)**: Supabase Cloud is migrated and seeded for `Achul_Nails`; public availability returns 45 slots; `POST /api/bookings` creates a `pending_payment` hold and real Mercado Pago Checkout Pro preferences; the Mercado Pago webhook route confirms approved payments, releases failed/expired payments, and dispatches confirmation notifications through `NotificationService`.

### Tests for User Story 1

- [x] T019 [P] [US1] Add contract tests for `POST /api/bookings` in `tests/contract/bookings.contract.test.ts`
- [x] T020 [P] [US1] Add contract tests for Mercado Pago webhook state mapping in `tests/contract/mercado-pago-webhook.contract.test.ts`
- [x] T021 [P] [US1] Add integration test for approved payment booking flow in `tests/integration/customer-booking-approved.test.ts`
- [x] T022 [P] [US1] Add integration test for rejected and expired payment slot release in `tests/integration/customer-booking-payment-failed.test.ts`

### Implementation for User Story 1

- [x] T023 [US1] Implement public business booking page in `app/[businessSlug]/page.tsx`
- [x] T024 [P] [US1] Implement service and professional selection UI in `components/booking/service-selector.tsx`
- [x] T025 [P] [US1] Implement slot picker UI in `components/booking/slot-picker.tsx`
- [x] T026 [P] [US1] Implement customer details form in `components/booking/customer-form.tsx`
- [x] T027 [US1] Implement availability endpoint in `app/api/public/businesses/[businessSlug]/availability/route.ts`
- [x] T028 [US1] Implement booking creation endpoint in `app/api/bookings/route.ts`
- [x] T029 [US1] Implement checkout preference creation using PaymentService in `lib/payments/mercado-pago-service.ts`
- [x] T030 [US1] Implement Mercado Pago webhook handler in `app/api/mercado-pago/webhook/route.ts`
- [x] T031 [US1] Dispatch `booking.confirmed` through NotificationService after approved payment in `lib/booking/booking-confirmation-service.ts`
- [x] T032 [US1] Ensure rejected/cancelled/expired webhooks move appointment to failed/expired state and release slot in `lib/booking/payment-webhook-service.ts`

**Checkpoint**: US1 is functional and testable without admin enhancements beyond seeded data.

---

## Phase 4: User Story 2 - Negocio configura agenda (Priority: P2)

**Goal**: Admin can configure services, professionals, weekly hours, and blocks that affect public availability.

**Independent Test**: Create a service, professional, hours, and block from admin, then verify public availability changes.

### Tests for User Story 2

- [x] T033 [P] [US2] Add integration test for admin service and hours setup in `tests/integration/admin-configures-agenda.test.ts`
- [x] T034 [P] [US2] Add integration test for availability block hiding public slots in `tests/integration/admin-blocks-availability.test.ts`

### Implementation for User Story 2

- [x] T035 [US2] Implement admin layout and navigation in `app/admin/layout.tsx`
- [x] T036 [P] [US2] Implement services admin page in `app/admin/servicios/page.tsx`
- [x] T037 [P] [US2] Implement professionals admin page in `app/admin/profesionales/page.tsx`
- [x] T038 [P] [US2] Implement business hours admin page in `app/admin/agenda/page.tsx`
- [x] T039 [P] [US2] Implement availability block form in `components/admin/availability-block-form.tsx`
- [x] T040 [US2] Implement admin services endpoints in `app/api/admin/services/route.ts`
- [x] T041 [US2] Implement admin professionals endpoints in `app/api/admin/professionals/route.ts`
- [x] T042 [US2] Implement admin business hours endpoint in `app/api/admin/business-hours/route.ts`
- [x] T043 [US2] Implement admin availability blocks endpoint in `app/api/admin/availability-blocks/route.ts`

**Checkpoint**: Admin configuration controls public booking availability.

---

## Phase 5: User Story 3 - Negocio gestiona turnos (Priority: P3)

**Goal**: Admin can view appointments, create manual no-deposit appointments, and mark attendance/no-show.

**Independent Test**: Create a manual appointment, verify it occupies the slot, and update attendance status.

### Tests for User Story 3

- [x] T044 [P] [US3] Add integration test for manual no-deposit appointment in `tests/integration/admin-manual-appointment.test.ts`
- [x] T045 [P] [US3] Add integration test for attendance and no-show status changes in `tests/integration/admin-appointment-status.test.ts`

### Implementation for User Story 3

- [x] T046 [US3] Implement admin appointments list page in `app/admin/turnos/page.tsx`
- [x] T047 [P] [US3] Implement appointment detail panel in `components/admin/appointment-detail.tsx`
- [x] T048 [P] [US3] Implement manual appointment form in `components/admin/manual-appointment-form.tsx`
- [x] T049 [US3] Implement manual appointment endpoint in `app/api/admin/appointments/manual/route.ts`
- [x] T050 [US3] Implement appointment status endpoint in `app/api/admin/appointments/[appointmentId]/status/route.ts`
- [x] T051 [US3] Show total, deposit paid, and remaining amount in `components/admin/appointment-detail.tsx`

**Checkpoint**: Admin can operate the daily schedule and handle pilot exceptions.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate the full MVP and prepare for handoff.

- [x] T052 [P] Add seed data for the quickstart pilot business in `supabase/seed.sql`
- [x] T053 [P] Document Mercado Pago OAuth Phase 2 notes in `docs/mercado-pago-oauth-phase-2.md`
- [x] T054 [P] Document notification adapter extension notes in `docs/notifications-phase-2.md`
- [x] T055 Add end-to-end smoke test for quickstart Scenario 1 in `tests/e2e/customer-booking-smoke.spec.ts`
- [x] T056 Run all tests and fix failures before demo
- [x] T057 Validate quickstart scenarios in `specs/001-mvp-anti-inasistencias/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup: no dependencies.
- Foundational: depends on Setup.
- US1, US2, US3: depend on Foundational.
- Polish: depends on selected user stories being complete.

### User Story Dependencies

- US1 can be implemented first using seeded data.
- US2 can be implemented after foundation and then replace seeded setup with admin-created setup.
- US3 can be implemented after foundation and uses the same appointment model as US1.

### Parallel Opportunities

- T003, T004, T005, and T006 can be completed in parallel.
- T008, T009, T010, T013, T015, T017, and T018 can be completed in parallel after T007 is drafted.
- US1 UI components T024, T025, and T026 can be completed in parallel.
- US2 admin pages T036, T037, T038, and T039 can be completed in parallel.
- US3 components T047 and T048 can be completed in parallel.

## Implementation Strategy

### MVP First

1. Complete Setup and Foundational phases.
2. Complete US1 with seeded pilot business data.
3. Validate payment approval, payment failure/expiry, slot release, and email notification.
4. Add US2 admin configuration.
5. Add US3 daily appointment management.

### Guardrails

- Do not call Resend directly from booking or payment logic.
- Do not confirm appointments before an approved Mercado Pago webhook.
- Do not keep rejected or expired payment appointments blocking availability.
- Do not implement WhatsApp or Mercado Pago OAuth in MVP code; only preserve extension points and documentation.
