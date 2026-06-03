# Auditoria pre-piloto Achul_Nails

Fecha: 2026-06-02

## Resultado

Estado local: listo para smoke productivo controlado.

La auditoria automatizada recorrio reserva publica, login/admin, turnos, WhatsApp, agenda, servicios, profesionales, personalizacion y cuenta en desktop y mobile. Tambien cubrio flujos criticos de reserva web, reserva por WhatsApp, operaciones admin, seguridad basica de admin/cron/webhooks y build de produccion.

## Comandos ejecutados

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

Resultados:

- `npm run typecheck`: paso.
- `npm run lint`: paso.
- `npm test`: paso, 38 archivos y 111 tests.
- `npm run build`: paso.
- `npm run test:e2e`: paso, 16 tests Playwright en desktop Chrome y mobile Chrome.

## Deploy y smoke productivo

Deploy production completado:

- Deployment id: `dpl_9jw2bKfyykLFd917bqXd6urHDqoG`
- URL alias: `https://turnos-estetica.vercel.app`

Smoke remoto posterior al deploy:

- `/`: `200`
- `/achul-nails`: `200`
- `/admin`: `307` sin sesion
- `/admin/login`: `200`
- `/admin/turnos`: `307` sin sesion
- `/api/jobs/expire-pending-payments`: `401` sin `CRON_SECRET`
- `/api/whatsapp/webhook` con verify token incorrecto: `403`

`ALLOW_ADMIN_API_KEY_FALLBACK` no aparece configurado en Vercel Production.

## Pantallas auditadas

- `/achul-nails`
- `/admin/login`
- `/admin`
- `/admin/turnos`
- `/admin/whatsapp`
- `/admin/agenda`
- `/admin/servicios`
- `/admin/profesionales`
- `/admin/personalizacion`
- `/admin/cuenta`

La suite valida que no haya overflow horizontal visible en desktop/mobile y adjunta screenshots en los artefactos de Playwright.

## Flujos cubiertos

- Reserva publica multi-servicio: seleccion de servicios, calendario, horario, datos, checkout fake, webhook aprobado y turno confirmado en admin.
- Admin: login real Supabase Auth, dashboard, listado de turnos, detalle, marcar asistencia, turno manual multi-servicio sin seña y turno manual con seña cash.
- WhatsApp: webhook inbound fake, deduplicacion de mensaje Meta, flujo guiado hasta link de pago y visibilidad en `/admin/whatsapp`.
- Seguridad: `/admin` redirige a login sin sesion, cron jobs rechazan sin `CRON_SECRET`, WhatsApp verify token rechaza token incorrecto y acepta token correcto.

## Fixes aplicados

- Endpoints admin mutantes ahora rechazan requests cross-origin cuando dependen de cookie/sesion. El bearer local/test sigue funcionando solo cuando el fallback esta habilitado.
- El formulario de turno manual ya no depende de `event.currentTarget` despues de awaits; usa una referencia estable al formulario.
- Playwright corre en serie porque el servidor `next dev` con tests desktop/mobile paralelos produjo errores de HMR/Fast Refresh. La cobertura se mantiene igual, pero la suite es mas estable.
- Se agregaron E2E de auditoria pre-piloto para pantallas, seguridad, operaciones admin y WhatsApp.

## Pendientes antes de entregar a clientas reales

- Smoke productivo manual con una seña real chica en Mercado Pago.
- Confirmar que WhatsApp use numero real de Achul_Nails si se va a invitar clientas reales por ese canal.
- Configurar Resend real con remitente/dominio verificado si se quieren emails confiables.
- Limpiar datos de prueba exactos antes de entregar el panel a tu hermana.

## Criterio actual

El sistema queda apto para el siguiente paso: smoke productivo controlado. No conviene abrirlo masivamente todavia hasta completar la prueba real de pago, webhook productivo y canal WhatsApp definitivo.
