# Feature Specification: MVP Anti-Inasistencias

**Feature Branch**: `001-mvp-anti-inasistencias`

**Created**: 2026-05-27

**Status**: Draft

**Input**: User description: "Organizar el primer MVP del sistema de turnos de estetica usando Spec Kit, centrado en agenda online, sena con Mercado Pago y confirmacion por email."

## User Scenarios & Testing

### User Story 1 - Cliente reserva con sena (Priority: P1)

Una clienta entra al link publico del negocio, elige un servicio, selecciona profesional si aplica, ve horarios disponibles, completa sus datos, paga la sena y recibe confirmacion del turno.

**Why this priority**: Es el nucleo del valor anti-inasistencias. Sin reserva publica con pago de sena, el producto no demuestra ROI.

**Independent Test**: Crear un negocio piloto con un servicio y horario disponible, completar una reserva desde el link publico, simular webhook aprobado de Mercado Pago y verificar que el turno queda confirmado y notificado por email.

**Acceptance Scenarios**:

1. **Given** un negocio activo con servicio, profesional y horario disponible, **When** una clienta completa la reserva y el pago queda aprobado, **Then** el turno queda confirmado, el slot deja de estar disponible y se envia email de confirmacion.
2. **Given** una reserva pendiente de pago, **When** Mercado Pago informa pago rechazado o expirado, **Then** el turno no queda confirmado y el slot vuelve a estar disponible.
3. **Given** un slot ya confirmado, **When** otra clienta intenta reservar el mismo horario, **Then** el sistema no permite la doble reserva.

---

### User Story 2 - Negocio configura agenda (Priority: P2)

La persona administradora del negocio configura servicios, precios, duracion, monto o porcentaje de sena, profesionales, horarios de atencion y bloqueos de disponibilidad.

**Why this priority**: Permite que el negocio publique una agenda realista sin asistencia tecnica constante.

**Independent Test**: Ingresar al panel admin, crear servicios y horarios, bloquear un periodo y verificar que la agenda publica solo muestra slots validos.

**Acceptance Scenarios**:

1. **Given** un negocio nuevo, **When** la administradora carga servicios, horarios y profesionales, **Then** el link publico muestra servicios y disponibilidad calculada.
2. **Given** un dia o rango bloqueado, **When** una clienta consulta disponibilidad, **Then** los slots bloqueados no aparecen.
3. **Given** un servicio inactivo, **When** una clienta abre el link publico, **Then** ese servicio no aparece para reservar.

---

### User Story 3 - Negocio gestiona turnos (Priority: P3)

La persona administradora ve los turnos confirmados, crea turnos manuales, marca asistencia o inasistencia y consulta cuanto resta cobrar luego de descontar la sena.

**Why this priority**: Cierra el ciclo operativo diario del negocio y permite manejar excepciones del piloto.

**Independent Test**: Crear turnos confirmados y manuales desde el panel, cambiar estado de asistencia y verificar el saldo restante a cobrar.

**Acceptance Scenarios**:

1. **Given** un turno confirmado con sena pagada, **When** la administradora abre el detalle, **Then** ve precio total, sena pagada y saldo restante.
2. **Given** una clienta de confianza, **When** la administradora crea un turno manual sin sena, **Then** el turno queda visible en la agenda y el slot queda ocupado.
3. **Given** un turno pasado, **When** la administradora marca asistencia o inasistencia, **Then** el estado queda registrado para reportes futuros.

### Edge Cases

- Dos clientas intentan reservar el mismo slot al mismo tiempo.
- Mercado Pago aprueba, rechaza o expira una preferencia despues de que la clienta abandona el checkout.
- Un negocio bloquea un horario que tenia una reserva pendiente de pago.
- Un servicio cambia duracion o precio despues de existir turnos futuros.
- La notificacion por email falla temporalmente.
- Las credenciales manuales de Mercado Pago para un negocio piloto no estan configuradas.

## Requirements

### Functional Requirements

- **FR-001**: System MUST expose a public booking URL per active business.
- **FR-002**: System MUST list only active services and valid professionals for the selected business.
- **FR-003**: System MUST calculate available slots using business hours, professional assignment, service duration, confirmed appointments, pending holds, and manual blocks.
- **FR-004**: System MUST prevent double booking for the same business, professional, date, and time range.
- **FR-005**: System MUST create a pending appointment hold before redirecting to Mercado Pago Checkout Pro.
- **FR-006**: System MUST confirm an appointment only after receiving an approved Mercado Pago webhook.
- **FR-007**: System MUST release the slot when Mercado Pago payment is rejected, cancelled, or expired.
- **FR-008**: System MUST send booking confirmations through a notification service interface.
- **FR-009**: System MUST implement an email notification adapter for MVP.
- **FR-010**: System MUST keep the notification interface channel-agnostic so WhatsApp can be added later without rewriting booking logic.
- **FR-011**: System MUST allow pilot Mercado Pago credentials to be configured manually by environment.
- **FR-012**: System MUST document a Phase 2 OAuth/connect design for Mercado Pago account onboarding.
- **FR-013**: Admin users MUST be able to create, edit, activate, and deactivate services.
- **FR-014**: Admin users MUST be able to configure professionals, weekly business hours, and manual availability blocks.
- **FR-015**: Admin users MUST be able to create manual appointments, including no-deposit appointments.
- **FR-016**: Admin users MUST be able to view appointment detail with total price, paid deposit, and remaining amount.
- **FR-017**: Admin users MUST be able to mark appointments as attended or no-show.
- **FR-018**: System MUST record notification send attempts and outcomes.

### Key Entities

- **Business**: Tenant that owns services, professionals, payment credentials, public slug, address, and booking settings.
- **Professional**: Person or resource that can deliver one or more services.
- **Service**: Bookable offering with name, duration, price, deposit policy, and active state.
- **BusinessHours**: Weekly availability rules per business or professional.
- **AvailabilityBlock**: Manual period where booking is unavailable.
- **Customer**: Person booking an appointment, identified by name, phone, and optional email.
- **Appointment**: Booking request or confirmed turn with service, professional, date/time, customer, source, and status.
- **Payment**: Mercado Pago deposit record linked to an appointment.
- **Notification**: Message request and delivery outcome for email now and future channels later.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A customer can complete a booking request and payment handoff in under 3 minutes on mobile.
- **SC-002**: 100% of approved payment webhooks produce exactly one confirmed appointment.
- **SC-003**: 100% of rejected or expired payment webhooks leave the slot available for another customer.
- **SC-004**: Double booking attempts for the same slot are blocked in automated tests.
- **SC-005**: An admin can configure one service, one professional, and weekly hours in under 10 minutes.
- **SC-006**: Confirmation email is queued or sent within 60 seconds after payment approval.
- **SC-007**: Each user story can be tested independently using the quickstart scenarios.

## Assumptions

- The MVP targets pilot beauty businesses in Argentina.
- The first pilot uses manually configured Mercado Pago credentials per business through environment variables.
- Mercado Pago OAuth onboarding is designed but deferred to Phase 2.
- WhatsApp and SMS are not implemented in MVP, but notification interfaces must support future adapters.
- Advanced analytics, campaigns, dynamic pricing, support tooling, and public API are out of scope for this feature.
- The product is positioned as an anti-no-show and revenue recovery system, not as a generic calendar.
