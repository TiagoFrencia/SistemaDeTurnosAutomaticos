# Turnos Estetica Constitution

## Core Principles

### I. Anti-Inasistencias First
Every product decision must support the main business promise: reduce no-shows and recover lost revenue for appointment-based beauty businesses. Agenda, deposit, and reminders are the core loop; secondary features must not dilute that loop.

### II. Pilot Simplicity
The pilot must favor manual, auditable operations over premature automation. Mercado Pago credentials are configured manually by environment for selected pilot businesses; OAuth connection is designed for Phase 2 but not required for MVP launch.

### III. Independent User Stories
Each user story must be independently testable and deliver visible value. The public booking flow, admin configuration, and appointment management must be separable enough to validate and demo incrementally.

### IV. Integration Safety
Payments, availability, and notifications are high-risk boundaries. A slot is only confirmed after a successful Mercado Pago webhook, rejected or expired payments must release the slot, and notifications must be dispatched through a channel-agnostic interface.

### V. Local Market Fit
The product is designed first for Argentina: Mercado Pago, Spanish-language UX, local beauty-service workflows, mobile-first admin usage, and practical onboarding for non-technical owners.

## Technical Constraints

- Use Next.js App Router for the web application, with Supabase for auth, PostgreSQL, and storage.
- Use Mercado Pago Checkout Pro for deposits during the MVP.
- Use Resend for transactional email through a notification service abstraction.
- Keep WhatsApp and SMS out of MVP implementation while preserving a notification adapter interface for later channels.
- Use Vercel-compatible deployment and environment configuration.

## Development Workflow

- Spec Kit artifacts are the source of truth for feature intent, architecture, tasks, and acceptance criteria.
- Tests must cover availability conflicts, payment state transitions, manual no-deposit appointments, notification dispatch, and user-story acceptance flows.
- Public interfaces, data entities, and environment variables must be documented before implementation work begins.
- Changes that alter payment, availability, or notification behavior require corresponding contract or test updates.

## Governance

This constitution supersedes ad hoc implementation choices. Any exception must be documented in the active feature plan with rationale, risk, and the simpler alternative considered.

**Version**: 1.0.0 | **Ratified**: 2026-05-27 | **Last Amended**: 2026-05-27
