# Guia de auditoria manual del MVP

## Objetivo

Esta guia permite auditar manualmente el flujo completo del MVP Anti-Inasistencias para el negocio piloto `achul-nails`.

Para la etapa de prueba real controlada con Achul_Nails, usar primero `docs/piloto-achul-nails.md`. Esta guia queda como soporte tecnico para auditar endpoints, tablas, webhooks y evidencia cuando aparezca un problema.

Tiene dos modos de uso:

- **Auditoria local reproducible**: usa `E2E_TEST_MODE=true`, checkout fake y webhook simulado. Es el camino recomendado para demo local.
- **Auditoria real externa**: usa Mercado Pago real, ngrok y Resend real. Sirve para validar integraciones externas, no para reemplazar la prueba local reproducible.

El MVP se aprueba para demo local cuando:

- Los comandos de salud pasan.
- El flujo cliente crea un turno, confirma pago simulado y bloquea el slot.
- La administradora ve el turno, revisa importes y cambia asistencia.
- Los turnos manuales bloquean disponibilidad.
- Las notificaciones quedan registradas, aunque el email real puede fallar si no hay `RESEND_API_KEY`.
- WhatsApp se puede auditar en modo fake local o con Meta Cloud API real; ver `docs/whatsapp-automation.md` para el setup completo.

## Precondiciones

Variables esperadas en `.env.local`:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ADMIN_API_KEY=...
MERCADOPAGO_ACCESS_TOKEN_ACHUL=...
RESEND_API_KEY=...
RESEND_FROM_EMAIL=...
NGROK_PUBLIC_URL=...
E2E_TEST_MODE=true
WHATSAPP_PROVIDER=fake
WHATSAPP_BUSINESS_SLUG=achul-nails
META_WHATSAPP_PHONE_NUMBER_ID=...
META_WHATSAPP_ACCESS_TOKEN=...
META_WHATSAPP_VERIFY_TOKEN=...
CRON_SECRET=...
```

Notas:

- Para auditoria local, `E2E_TEST_MODE=true` evita depender de Mercado Pago real.
- Para auditoria real, `E2E_TEST_MODE` debe estar vacio o distinto de `true`.
- `RESEND_API_KEY` puede estar vacio en local; en ese caso la notificacion puede quedar como `failed`.
- Nunca compartir ni commitear `.env.local`.

Datos piloto esperados:

| Campo | Valor |
|-------|-------|
| Negocio | `Achul_Nails` |
| Slug | `achul-nails` |
| Profesional | `Azul` |
| Servicio | `Manicure semipermanente` |
| Duracion | 60 minutos |
| Precio total | ARS 5000 |
| Sena | ARS 1500 |
| Horario | Lunes a viernes, 09:00 a 18:00 |

Desde la version multi-servicio, la reserva publica debe permitir combinar mas de un servicio en un unico turno con el mismo profesional. La duracion, el total y la sena se calculan sumando los servicios elegidos. Si el turno tiene un solo servicio, el comportamiento anterior sigue siendo valido.

## Checklist inicial

Ejecutar desde la raiz del repo:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

Resultado esperado:

- `typecheck`, `lint` y `build` terminan sin errores.
- `npm test` pasa toda la suite Vitest.
- `npm run test:e2e` pasa el smoke de reserva, pago fake y visibilidad admin.

Verificar seed desde Supabase SQL Editor:

```sql
select
  b.name,
  b.slug,
  p.name as professional,
  s.name as service,
  s.duration_minutes,
  s.price_amount,
  s.deposit_value
from businesses b
join professionals p on p.business_id = b.id
join services s on s.business_id = b.id
where b.slug = 'achul-nails';
```

Resultado esperado:

- Una fila para `Achul_Nails`.
- Profesional `Azul`.
- Servicio `Manicure semipermanente`.
- `duration_minutes = 60`, `price_amount = 5000`, `deposit_value = 1500`.

## Auditoria local reproducible

### 1. Levantar la app

Configurar:

```bash
E2E_TEST_MODE=true
ADMIN_API_KEY=e2e-admin-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Iniciar:

```bash
npm run dev
```

Abrir:

```text
http://localhost:3000/achul-nails
```

Evidencia:

- Captura de la pagina publica.
- Servicio, profesional y slots visibles.

### 2. Ver disponibilidad publica

Desde navegador o cliente HTTP:

```text
GET http://localhost:3000/api/public/businesses/achul-nails/availability?from=2026-06-01T00:00:00-03:00&to=2026-07-01T00:00:00-03:00
```

Resultado esperado:

- HTTP `200`.
- `business.slug = "achul-nails"`.
- Hay slots disponibles para `Azul`.
- La ventana cubre 30 dias, por lo que una clienta puede buscar turnos para dentro de una semana o 15 dias.
- La respuesta incluye `selectedServiceIds` y `selectedServices`; para reservas simples debe traer un solo servicio.

Para auditar multi-servicio, copiar dos IDs activos de `services` y llamar:

```text
GET http://localhost:3000/api/public/businesses/achul-nails/availability?from=2026-06-01T00:00:00-03:00&to=2026-07-01T00:00:00-03:00&serviceIds=SERVICIO_1&serviceIds=SERVICIO_2
```

Resultado esperado:

- `selectedServiceIds` conserva los dos IDs elegidos.
- `service.durationMinutes` es la suma de duraciones.
- `service.priceAmount` es la suma de precios.
- `service.depositAmount` es la suma de senas.
- Los slots disponibles respetan la duracion combinada, es decir bloquean un tramo continuo suficiente para hacer todos los servicios.

Evidencia:

- Guardar response JSON.
- Anotar un slot elegido para la reserva.

### 3. Crear reserva como cliente

En `/achul-nails`:

1. Seleccionar `Manicure semipermanente`.
2. Seleccionar profesional `Azul`.
3. Elegir un slot disponible.
4. Completar datos de auditoria:

```text
Nombre: Auditoria Local Cliente
Telefono: +5491100012345
Email: auditoria-local@example.com
```

5. Click en `Continuar a Mercado Pago`.

Resultado esperado en modo local:

- Redireccion a `/e2e/checkout`.
- La pagina muestra `appointmentId` y `providerPaymentId`.

Evidencia:

- Captura de `/e2e/checkout`.
- Anotar `appointmentId`.
- Anotar `providerPaymentId`.

Verificar hold `pending_payment`:

```sql
select
  a.id,
  a.status,
  a.source,
  a.start_at,
  a.end_at,
  a.total_amount,
  a.deposit_amount,
  a.remaining_amount,
  c.full_name,
  c.phone,
  c.email
from appointments a
join customers c on c.id = a.customer_id
where a.id = '<appointmentId>';
```

Resultado esperado:

- `status = 'pending_payment'`.
- `source = 'public'`.
- `total_amount = 5000`.
- `deposit_amount = 1500`.
- `remaining_amount = 3500`.

### 4. Simular pago aprobado

Ejecutar POST al webhook local:

```bash
curl -X POST http://localhost:3000/api/mercado-pago/webhook ^
  -H "Content-Type: application/json" ^
  -d "{\"appointmentId\":\"<appointmentId>\",\"providerPaymentId\":\"<providerPaymentId>\",\"status\":\"approved\",\"statusDetail\":\"accredited\"}"
```

En PowerShell tambien puede usarse:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3000/api/mercado-pago/webhook" `
  -ContentType "application/json" `
  -Body '{"appointmentId":"<appointmentId>","providerPaymentId":"<providerPaymentId>","status":"approved","statusDetail":"accredited"}'
```

Resultado esperado:

- HTTP `200`.
- El turno pasa a `confirmed`.
- Se registra pago `approved`.
- Se registra intento de notificacion `booking.confirmed`.

Auditar en base:

```sql
select
  a.id,
  a.status,
  p.provider,
  p.provider_payment_id,
  p.status as payment_status,
  p.amount,
  n.channel,
  n.template_key,
  n.status as notification_status,
  n.error
from appointments a
left join payments p on p.appointment_id = a.id
left join notifications n on n.appointment_id = a.id
where a.id = '<appointmentId>';
```

Resultado esperado:

- `a.status = 'confirmed'`.
- `p.status = 'approved'`.
- `p.amount = 1500`.
- `n.template_key = 'booking.confirmed'`.
- `n.status` puede ser `sent`, `queued` o `failed` segun configuracion de email.

### 5. Verificar que el slot quedo ocupado

Volver a:

```text
http://localhost:3000/achul-nails
```

Resultado esperado:

- El mismo slot ya no aparece como disponible.

Evidencia:

- Captura de la lista de slots posterior al pago.
- Comparar contra el slot anotado antes.

### 6. Auditar vista admin de turnos

Abrir:

```text
http://localhost:3000/admin/turnos
```

Si aparece formulario de clave:

1. Ingresar el valor de `ADMIN_API_KEY`.
2. Guardar.
3. Recargar si hace falta.

Resultado esperado:

- La lista muestra `Auditoria Local Cliente`.
- Estado `confirmed`.
- Datos visibles: telefono, email, servicio, profesional, horario y saldo.

Evidencia:

- Captura de la tarjeta del turno.

### 7. Auditar detalle e importes

En `/admin/turnos`:

1. Click en `Ver detalle`.
2. Revisar datos de cliente, servicio, profesional, notas y estado.
3. Revisar resumen de cobro.

Resultado esperado:

- Total: ARS 5000.
- Sena: ARS 1500.
- Saldo restante: ARS 3500.
- No se modifican pagos al abrir detalle.

Auditar en base:

```sql
select
  id,
  status,
  total_amount,
  deposit_amount,
  remaining_amount
from appointments
where id = '<appointmentId>';
```

### 8. Marcar asistencia

En el detalle del turno:

1. Click en `Asistio`.
2. Esperar refresco de la pagina.

Resultado esperado:

- Estado del turno: `attended`.
- El pago sigue `approved`.
- No se crea un pago nuevo.

Auditar:

```sql
select
  a.status,
  count(p.id) as payment_count,
  max(p.status) as payment_status
from appointments a
left join payments p on p.appointment_id = a.id
where a.id = '<appointmentId>'
group by a.status;
```

Resultado esperado:

- `status = 'attended'`.
- `payment_count = 1`.
- `payment_status = 'approved'`.

Para auditar `no_show` o `cancelled`, crear otro turno de prueba y repetir el cambio desde detalle. No reutilizar un turno ya usado si se necesita conservar evidencia limpia.

## Auditoria de turnos manuales

### 1. Crear turno manual sin sena

En `/admin/turnos`:

1. Completar formulario manual con cliente unico:

```text
Nombre: Auditoria Manual Sin Sena
Telefono: +5491100012350
Email: auditoria-manual-none@example.com
Modo de sena: Sin sena
```

2. Seleccionar servicio y profesional.
3. Elegir fecha/hora futura libre.
4. Crear turno.

Resultado esperado:

- Turno creado como `confirmed`.
- `source = 'manual'`.
- `deposit_required = false`.
- `deposit_amount = 0`.
- `remaining_amount = 5000`.
- No se crea pago.

Auditar:

```sql
select
  a.id,
  a.status,
  a.source,
  a.deposit_required,
  a.total_amount,
  a.deposit_amount,
  a.remaining_amount,
  count(p.id) as payments
from appointments a
join customers c on c.id = a.customer_id
left join payments p on p.appointment_id = a.id
where c.email = 'auditoria-manual-none@example.com'
group by a.id;
```

### 2. Crear turno manual con sena cash

En `/admin/turnos`:

1. Completar cliente unico:

```text
Nombre: Auditoria Manual Cash
Telefono: +5491100012351
Email: auditoria-manual-cash@example.com
Modo de sena: Sena pagada en efectivo
```

2. Seleccionar servicio, profesional y horario futuro libre.
3. Crear turno.

Resultado esperado:

- Turno `confirmed`.
- `deposit_required = true`.
- `deposit_amount = 1500`.
- `remaining_amount = 3500`.
- Pago asociado con `provider = 'cash'` y `status = 'approved'`.

Auditar:

```sql
select
  a.id,
  a.status,
  a.deposit_required,
  a.total_amount,
  a.deposit_amount,
  a.remaining_amount,
  p.provider,
  p.status as payment_status,
  p.amount
from appointments a
join customers c on c.id = a.customer_id
left join payments p on p.appointment_id = a.id
where c.email = 'auditoria-manual-cash@example.com';
```

### 3. Verificar bloqueo del horario manual

Volver a `/achul-nails` y buscar la fecha/hora usada.

Resultado esperado:

- El slot manual ya no aparece disponible.

## Auditoria de agenda admin

### Servicios

Abrir:

```text
http://localhost:3000/admin/servicios
```

Acciones:

1. Crear un servicio de auditoria con nombre unico, por ejemplo `Servicio Auditoria Temporal`.
2. Verificar que aparece en la lista.
3. Editar precio o duracion si la UI lo permite.

Auditar:

```sql
select
  name,
  duration_minutes,
  price_amount,
  deposit_type,
  deposit_value,
  active
from services
where name ilike '%Auditoria%';
```

### Profesionales

Abrir:

```text
http://localhost:3000/admin/profesionales
```

Acciones:

1. Crear profesional con nombre unico, por ejemplo `Profesional Auditoria`.
2. Verificar que aparece en la lista.

Auditar:

```sql
select name, active
from professionals
where name ilike '%Auditoria%';
```

### Horarios y bloqueos

Abrir:

```text
http://localhost:3000/admin/agenda
```

Acciones:

1. Revisar horarios semanales de `Azul`.
2. Crear un bloqueo futuro para `Azul`.
3. Verificar que la disponibilidad publica ya no ofrece slots dentro del rango bloqueado.

Auditar:

```sql
select
  b.name as business,
  p.name as professional,
  ab.start_at,
  ab.end_at,
  ab.reason
from availability_blocks ab
join businesses b on b.id = ab.business_id
left join professionals p on p.id = ab.professional_id
where b.slug = 'achul-nails'
order by ab.created_at desc
limit 20;
```

## Auditoria real externa

Usar esta seccion solo cuando se quiera validar integraciones reales.

### 1. Configurar entorno real

En `.env.local`:

```bash
E2E_TEST_MODE=
MERCADOPAGO_ACCESS_TOKEN_ACHUL=<token real o sandbox valido>
RESEND_API_KEY=<api key real>
RESEND_FROM_EMAIL=<sender verificado>
ADMIN_API_KEY=<clave admin>
```

Levantar app:

```bash
npm run dev
```

Exponer con ngrok:

```bash
npm run dev:ngrok
```

Copiar la URL HTTPS en `.env.local`:

```bash
NGROK_PUBLIC_URL=https://tu-url.ngrok-free.app
```

Reiniciar `npm run dev`.

Resultado esperado:

- Las preferencias de checkout usan `https://tu-url.ngrok-free.app/api/mercado-pago/webhook` como notification URL.

### 2. Crear reserva real

Abrir:

```text
http://localhost:3000/achul-nails
```

Completar una reserva con cliente de auditoria:

```text
Nombre: Auditoria Real Cliente
Telefono: +5491100012360
Email: auditoria-real@example.com
```

Resultado esperado:

- Redireccion a Mercado Pago real.
- Se puede completar o simular pago segun cuenta/test credentials.

Evidencia:

- Captura del checkout.
- `appointmentId` desde base de datos.
- `provider_preference_id` en `payments`.

### 2.1 Validar "dinero en cuenta" en Mercado Pago

El MVP excluye pagos offline tipo Pago Facil/Rapipago con `payment_methods.excluded_payment_types = [{ id: "ticket" }]`. No fuerza `purpose: "wallet_purchase"`, porque eso obligaria al comprador a usar cuenta Mercado Pago y puede restringir otras opciones como transferencias.

Para que "dinero en cuenta" aparezca en Checkout Pro, la cuenta compradora debe estar logueada en Mercado Pago y tener saldo disponible. Si se usan usuarios de prueba, validar que el usuario comprador tenga dinero cargado y que no sea la misma cuenta vendedora.

Diagnostico de solo lectura:

```bash
npm run mp:payment-methods
```

Resultado esperado:

- La tabla muestra los medios que Mercado Pago declara disponibles para `MERCADOPAGO_ACCESS_TOKEN_ACHUL`.
- Si aparece `account_money`, pero no se ve en Checkout Pro, guardar evidencia de la sesion compradora, saldo disponible y captura del checkout.
- Si no aparece `account_money`, documentarlo como disponibilidad/configuracion de Mercado Pago para esa credencial, pais o tipo de cuenta.
- En ningun caso debe reaparecer `ticket` como efectivo offline para el cliente publico.

Auditar hold:

```sql
select
  a.id,
  a.status,
  p.provider,
  p.provider_preference_id,
  p.status as payment_status
from appointments a
join customers c on c.id = a.customer_id
left join payments p on p.appointment_id = a.id
where c.email = 'auditoria-real@example.com'
order by a.created_at desc
limit 1;
```

### 3. Confirmar webhook real

Luego del pago:

1. Esperar webhook de Mercado Pago.
2. Revisar logs de Next.js.
3. Revisar base de datos.

Resultado esperado:

- Turno `confirmed`.
- Pago `approved`.
- Notificacion registrada.

Auditar:

```sql
select
  a.id,
  a.status,
  p.provider_payment_id,
  p.status as payment_status,
  p.raw_status,
  p.raw_status_detail,
  p.webhook_received_at,
  n.status as notification_status,
  n.provider_message_id,
  n.error
from appointments a
left join payments p on p.appointment_id = a.id
left join notifications n on n.appointment_id = a.id
where a.id = '<appointmentId>';
```

Resultado aceptable:

- `payment_status = 'approved'`.
- `webhook_received_at` no es null.
- `notification_status = 'sent'` o `queued` si Resend esta correctamente configurado.
- Si `notification_status = 'failed'`, revisar `n.error` y configuracion de Resend.

## Consultas de auditoria rapida

Ultimos turnos:

```sql
select
  a.id,
  a.created_at,
  a.start_at,
  a.end_at,
  a.status,
  a.source,
  c.full_name,
  c.phone,
  c.email,
  s.name as service,
  p.name as professional,
  a.total_amount,
  a.deposit_amount,
  a.remaining_amount
from appointments a
join customers c on c.id = a.customer_id
join services s on s.id = a.service_id
join professionals p on p.id = a.professional_id
join businesses b on b.id = a.business_id
where b.slug = 'achul-nails'
order by a.created_at desc
limit 20;
```

Pagos recientes:

```sql
select
  p.created_at,
  p.provider,
  p.provider_preference_id,
  p.provider_payment_id,
  p.status,
  p.amount,
  p.raw_status,
  p.raw_status_detail,
  c.email
from payments p
join appointments a on a.id = p.appointment_id
join customers c on c.id = a.customer_id
order by p.created_at desc
limit 20;
```

Notificaciones recientes:

```sql
select
  created_at,
  channel,
  template_key,
  recipient,
  status,
  provider_message_id,
  error
from notifications
order by created_at desc
limit 20;
```

Slots bloqueantes activos:

```sql
select
  a.id,
  a.start_at,
  a.end_at,
  a.status,
  c.full_name,
  p.name as professional
from appointments a
join customers c on c.id = a.customer_id
join professionals p on p.id = a.professional_id
where a.status in ('pending_payment', 'confirmed')
order by a.start_at asc
limit 50;
```

## Limpieza manual controlada

Usar solo con clientes de auditoria creados con emails o telefonos unicos. No borrar datos reales del piloto.

Primero revisar que los datos a borrar son correctos:

```sql
select
  c.id as customer_id,
  c.full_name,
  c.phone,
  c.email,
  a.id as appointment_id,
  a.status,
  a.start_at
from customers c
left join appointments a on a.customer_id = c.id
where c.email in (
  'auditoria-local@example.com',
  'auditoria-manual-none@example.com',
  'auditoria-manual-cash@example.com',
  'auditoria-real@example.com'
)
or c.phone in (
  '+5491100012345',
  '+5491100012350',
  '+5491100012351',
  '+5491100012360'
);
```

Si la revision es correcta, borrar en este orden:

```sql
with audit_customers as (
  select id
  from customers
  where email in (
    'auditoria-local@example.com',
    'auditoria-manual-none@example.com',
    'auditoria-manual-cash@example.com',
    'auditoria-real@example.com'
  )
  or phone in (
    '+5491100012345',
    '+5491100012350',
    '+5491100012351',
    '+5491100012360'
  )
),
audit_appointments as (
  select id
  from appointments
  where customer_id in (select id from audit_customers)
)
delete from payments
where appointment_id in (select id from audit_appointments);
```

```sql
with audit_customers as (
  select id
  from customers
  where email in (
    'auditoria-local@example.com',
    'auditoria-manual-none@example.com',
    'auditoria-manual-cash@example.com',
    'auditoria-real@example.com'
  )
  or phone in (
    '+5491100012345',
    '+5491100012350',
    '+5491100012351',
    '+5491100012360'
  )
),
audit_appointments as (
  select id
  from appointments
  where customer_id in (select id from audit_customers)
)
delete from notifications
where appointment_id in (select id from audit_appointments);
```

```sql
delete from appointments
where customer_id in (
  select id
  from customers
  where email in (
    'auditoria-local@example.com',
    'auditoria-manual-none@example.com',
    'auditoria-manual-cash@example.com',
    'auditoria-real@example.com'
  )
  or phone in (
    '+5491100012345',
    '+5491100012350',
    '+5491100012351',
    '+5491100012360'
  )
);
```

```sql
delete from customers
where email in (
  'auditoria-local@example.com',
  'auditoria-manual-none@example.com',
  'auditoria-manual-cash@example.com',
  'auditoria-real@example.com'
)
or phone in (
  '+5491100012345',
  '+5491100012350',
  '+5491100012351',
  '+5491100012360'
);
```

Verificacion posterior:

```sql
select count(*) as remaining_audit_customers
from customers
where email like 'auditoria-%@example.com';
```

Resultado esperado:

- `remaining_audit_customers = 0`, salvo que se hayan usado otros emails de auditoria no listados.

## Evidencia minima para cierre manual

Guardar en una carpeta de auditoria:

- Captura de `/achul-nails` antes de reservar.
- Response JSON de disponibilidad.
- Captura de checkout fake o Mercado Pago real.
- `appointmentId` y `providerPaymentId`.
- Consulta SQL del turno `pending_payment`.
- Consulta SQL del turno `confirmed`.
- Captura de `/admin/turnos`.
- Captura del detalle con total, sena y saldo.
- Consulta SQL de pago y notificacion.
- Captura o SQL del cambio a `attended` o `no_show`.
- Captura o SQL de turno manual sin sena.
- Captura o SQL de turno manual con sena cash.

## Criterio final

La auditoria manual esta aprobada si:

- No hay doble reserva del mismo slot.
- Los pagos aprobados confirman turno.
- Los pagos rechazados o expirados liberan slot.
- Los turnos manuales bloquean disponibilidad.
- La vista admin muestra cliente, servicio, profesional, estado e importes correctos.
- Marcar asistencia no modifica pagos.
- Las notificaciones se registran por `NotificationService`.
- La auditoria real externa documenta claramente cualquier fallo de Resend, ngrok o Mercado Pago como dependencia externa.
