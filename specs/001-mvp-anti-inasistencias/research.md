# Research: MVP Anti-Inasistencias

## Decision: Mercado Pago credentials are manual in pilot

**Rationale**: The pilot uses selected businesses and can be configured by the project owner. Manual environment configuration avoids OAuth onboarding complexity and reduces fiscal risk by keeping each business connected to its own Mercado Pago account.

**Alternatives considered**:

- Platform account collecting all deposits: simpler checkout ownership, but higher operational and fiscal risk.
- Full OAuth/connect onboarding in MVP: better self-service UX, but slower to validate the core anti-no-show loop.

## Decision: Design Mercado Pago OAuth for Phase 2

**Rationale**: The MVP should not block future self-service onboarding. Payment code should isolate credential resolution behind a provider interface so Phase 2 can replace manual environment lookup with OAuth-stored business credentials.

**Alternatives considered**:

- Hard-code one access token globally: unacceptable for multi-business pilot.
- Store credentials directly in admin UI during MVP: higher security risk and extra UI scope.

## Decision: Pending appointments act as temporary slot holds

**Rationale**: A user must not lose the slot while redirected to checkout, but the business must not keep unpaid appointments forever. Pending holds allow payment handoff while preserving availability integrity.

**Alternatives considered**:

- Only create appointment after payment: simpler data model, but allows two customers to pay for the same slot.
- Confirm appointment before payment: violates the anti-no-show promise.

## Decision: Release slot on rejected, cancelled, or expired payment

**Rationale**: Failed payments should not block business availability. The webhook handler must move the appointment out of the reserving state and make the slot bookable again.

**Alternatives considered**:

- Keep failed appointment visible as pending: creates ghost blocks and reduces revenue.
- Ask admin to release manually: too fragile for pilot operations.

## Decision: Channel-agnostic notifications with email adapter first

**Rationale**: Email is enough for MVP confirmation, while WhatsApp is a strategic Phase 2 channel. A notification interface prevents booking and payment logic from calling Resend directly.

**Alternatives considered**:

- Direct Resend calls from booking service: fastest now, but creates avoidable rework.
- Implement WhatsApp now: commercially appealing, but adds template approval, provider cost, and delivery complexity.

## Decision: Next.js plus Supabase for the first product shell

**Rationale**: The source plan selected Next.js, Supabase, Vercel, Mercado Pago, and Resend for a small-team MVP. This stack keeps frontend, backend routes, auth, database, and hosting simple.

**Alternatives considered**:

- Separate backend and frontend services: more deployment and integration work for no pilot benefit.
- No-code scheduling tools: faster demos, but weak fit for Mercado Pago, slot/payment control, and future product ownership.
