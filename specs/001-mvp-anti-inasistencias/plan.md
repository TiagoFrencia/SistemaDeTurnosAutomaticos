# Implementation Plan: MVP Anti-Inasistencias

**Branch**: `001-mvp-anti-inasistencias` | **Date**: 2026-05-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-mvp-anti-inasistencias/spec.md`

## Summary

Build the first MVP slice for an anti-no-show appointment system for beauty businesses in Argentina. The MVP includes public booking, deposit payment with Mercado Pago Checkout Pro, email confirmation, admin schedule configuration, manual appointments, and payment-driven slot confirmation/release.

## Technical Context

**Language/Version**: TypeScript on Node.js LTS

**Primary Dependencies**: Next.js 14 App Router, Supabase client/server SDK, Mercado Pago SDK or REST client, Resend SDK, Zod, React Hook Form or equivalent form validation

**Storage**: Supabase PostgreSQL for business data, appointments, payments, and notifications; Supabase Storage for future business assets

**Testing**: Unit tests for domain services, integration tests for booking/payment flows, contract tests for public routes and webhooks, end-to-end smoke tests for critical user journeys

**Target Platform**: Vercel-hosted web application with Supabase backend services

**Project Type**: Web application with server-rendered public booking pages, admin dashboard, and server-side webhook endpoints

**Performance Goals**: Public booking pages should feel instant on mobile; available slot lookup should complete within 2 seconds for a pilot business schedule

**Constraints**: Prevent double booking, confirm only on approved payment webhook, release slots on rejected/expired payment, keep Mercado Pago credentials manual for pilot, keep notification interface ready for future WhatsApp adapter

**Scale/Scope**: Pilot scope of selected businesses, one country, Spanish UX, no WhatsApp implementation, no Mercado Pago OAuth implementation

## Constitution Check

- Anti-Inasistencias First: PASS. Scope is limited to agenda, deposit, and confirmation.
- Pilot Simplicity: PASS. Mercado Pago credentials are manual environment configuration for pilot.
- Independent User Stories: PASS. US1, US2, and US3 are independently testable.
- Integration Safety: PASS. Payment state transitions and notification abstraction are explicit.
- Local Market Fit: PASS. Mercado Pago, Argentina, and beauty businesses are the primary context.

## Project Structure

### Documentation

```text
specs/001-mvp-anti-inasistencias/
|-- spec.md
|-- plan.md
|-- research.md
|-- data-model.md
|-- quickstart.md
|-- contracts/
|   |-- api.md
|   |-- notifications.md
|   `-- mercado-pago.md
|-- checklists/
|   `-- requirements.md
`-- tasks.md
```

### Source Code

```text
app/
|-- [businessSlug]/
|   `-- page.tsx
|-- admin/
|   |-- agenda/
|   |-- servicios/
|   |-- profesionales/
|   `-- turnos/
|-- api/
|   |-- bookings/
|   |-- mercado-pago/
|   |   `-- webhook/
|   `-- admin/
components/
|-- booking/
|-- admin/
`-- ui/
lib/
|-- availability/
|-- booking/
|-- payments/
|-- notifications/
|-- supabase/
`-- validation/
supabase/
|-- migrations/
`-- seed.sql
tests/
|-- unit/
|-- integration/
|-- contract/
`-- e2e/
```

**Structure Decision**: Use a single Next.js application with domain logic in `lib/`, UI in `components/`, route handlers in `app/api/`, and Supabase migrations in `supabase/migrations/`.

## Phase 0 Research Output

See [research.md](./research.md). Main decisions:

- Use manual Mercado Pago credentials in pilot through environment variables mapped by business.
- Design OAuth/connect onboarding for Phase 2 without implementing it.
- Use a notification service interface with an email adapter in MVP.
- Treat pending payment appointments as temporary holds; release them when payment expires, rejects, or is cancelled.

## Phase 1 Design Output

- Data model: [data-model.md](./data-model.md)
- API contracts: [contracts/api.md](./contracts/api.md)
- Notification contract: [contracts/notifications.md](./contracts/notifications.md)
- Mercado Pago contract: [contracts/mercado-pago.md](./contracts/mercado-pago.md)
- Quickstart: [quickstart.md](./quickstart.md)

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Notification abstraction in MVP | WhatsApp is a planned Phase 2 channel and booking logic should not depend directly on email | Direct Resend calls in booking flow would force later rewrite |
| Manual MP credential mapping | Pilot needs low-friction controlled setup before OAuth | Platform-level account would increase fiscal and operational risk |
