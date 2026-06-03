# WhatsApp Automation MVP

## Objetivo

WhatsApp queda implementado como canal real de automatizacion para dos usos:

- confirmaciones y recordatorios de turnos;
- reserva guiada por chat con mensajes interactivos normales.

El MVP evita IA libre y mensajes promocionales. Esto mantiene el flujo barato, predecible y alineado con las reglas actuales: disponibilidad real, hold `pending_payment`, pago online por Mercado Pago y confirmacion solo por webhook aprobado.

Los menus interactivos de reserva no son templates aprobados. Se usan para responder dentro de una conversacion iniciada por la clienta o dentro de la ventana de atencion de WhatsApp. Para avisos iniciados por el negocio fuera de esa ventana, como recordatorios futuros, siguen aplicando templates aprobados de Meta segun categoria y costos vigentes.

## Proveedor Recomendado

Para produccion, el camino recomendado por costo es Meta Cloud API directo:

- no agrega fee extra de BSP/Twilio;
- usa credenciales por env vars;
- requiere configurar una app Meta, un numero de WhatsApp Business y el webhook publico.

Twilio queda como alternativa operativa si el onboarding directo con Meta se vuelve lento, pero no es la opcion costo-first.

## Variables De Entorno

```bash
WHATSAPP_PROVIDER=fake # fake | meta
WHATSAPP_BUSINESS_SLUG=achul-nails
META_WHATSAPP_PHONE_NUMBER_ID=
META_WHATSAPP_ACCESS_TOKEN=
META_WHATSAPP_VERIFY_TOKEN=
CRON_SECRET=
```

En local y E2E usar `WHATSAPP_PROVIDER=fake` para no generar cargos. En produccion usar `WHATSAPP_PROVIDER=meta` junto con las credenciales de Meta.

## Rutas

### `GET /api/whatsapp/webhook`

Verifica el webhook de Meta. Meta envia:

- `hub.mode=subscribe`
- `hub.verify_token`
- `hub.challenge`

La app responde el challenge solo si `hub.verify_token` coincide con `META_WHATSAPP_VERIFY_TOKEN`.

### `POST /api/whatsapp/webhook`

Recibe mensajes entrantes de Meta. El bot:

1. saluda y muestra una lista interactiva de servicios;
2. permite sumar servicios con botones `Agregar otro`, `Continuar` y `Cancelar`;
3. pide profesional con lista interactiva cuando hay mas de una opcion;
4. pide dia con lista interactiva y paginacion si hay mas de 10 opciones;
5. pide horario con lista interactiva y paginacion si hay mas de 10 opciones;
6. pide nombre;
7. pide email;
8. muestra un resumen con botones `Confirmar y pagar`, `Cambiar horario` y `Cancelar`;
9. crea un hold con la misma logica de `POST /api/bookings` solo cuando el cliente confirma;
10. responde un boton CTA `Pagar seña` con el link de Mercado Pago, con fallback textual si Meta rechaza ese formato.

No acepta efectivo por WhatsApp. El efectivo queda solo para el formulario manual admin.

WhatsApp no permite seleccionar multiples filas de una lista en una sola accion. Por eso la reserva multi-servicio se resuelve agregando un servicio por vez y luego tocando `Continuar`. El modo texto sigue disponible como fallback: por ejemplo `1,2`, `volver`, `cancelar` o `ayuda`.

Comandos disponibles durante la reserva:

- `ayuda`: muestra que puede responder segun el paso actual.
- `volver`: retrocede un paso sin reiniciar todo el flujo.
- `cancelar`: limpia la seleccion actual.
- `hola`, `menu` o `inicio`: reinician el flujo desde servicios.

### `GET /api/jobs/appointment-reminders`

Job protegido por:

```http
Authorization: Bearer <CRON_SECRET>
```

Busca turnos `confirmed` entre 23 y 25 horas desde el momento de ejecucion y envia `booking.reminder`. Usa la tabla `notifications` para no reenviar el mismo recordatorio por canal/template/turno.

## Persistencia

La tabla `whatsapp_conversations` guarda el estado temporal de cada chat:

- negocio;
- telefono;
- estado actual;
- seleccion parcial en `context`;
- ultimo mensaje;
- expiracion.

La reserva final se guarda en las tablas existentes: `customers`, `appointments`, `appointment_services` y `payments`.

## Fallbacks

- Si WhatsApp esta configurado, confirmaciones y recordatorios intentan WhatsApp primero.
- Si WhatsApp falla y hay email, se envia email.
- Si falla WhatsApp, no cambia el estado del turno.
- Si el horario se ocupa durante la conversacion, el bot pide elegir otro horario.
- El bot no crea appointment ni payment hasta que el cliente confirma el resumen final.

## Prueba Local

1. Configurar:

```bash
WHATSAPP_PROVIDER=fake
CRON_SECRET=local-cron-secret
E2E_TEST_MODE=true
```

2. Ejecutar:

```bash
npm run dev
```

3. Probar el webhook con un payload Meta de texto hacia:

```bash
POST http://localhost:3000/api/whatsapp/webhook
```

4. Probar recordatorios:

```bash
curl -H "Authorization: Bearer local-cron-secret" http://localhost:3000/api/jobs/appointment-reminders
```

## Prueba Con Meta Real

1. Levantar la app local.
2. Exponerla con ngrok o desplegarla.
3. Configurar en Meta:

```text
Callback URL: https://tu-dominio/api/whatsapp/webhook
Verify token: META_WHATSAPP_VERIFY_TOKEN
```

4. Activar `WHATSAPP_PROVIDER=meta`.
5. Enviar un mensaje al numero de WhatsApp Business.
6. Verificar en Supabase:

- una fila en `whatsapp_conversations`;
- una fila `notifications.channel = 'whatsapp'` para confirmacion o recordatorio;
- un appointment `pending_payment` cuando el bot completa una reserva;
- un payment `pending` con link de Mercado Pago.

## Checklist Produccion Estable

Antes de usar WhatsApp en una demo externa o produccion:

- Usar un dominio HTTPS fijo, por ejemplo Vercel, para `https://tu-dominio/api/whatsapp/webhook`.
- Configurar ese dominio en Meta Webhooks y verificarlo con `META_WHATSAPP_VERIFY_TOKEN`.
- Confirmar que el campo `messages` quede suscripto.
- Reemplazar el token temporal por un token permanente de Meta Business/System User.
- Darle al token permisos `whatsapp_business_messaging` y `whatsapp_business_management`.
- Rotar el token si se filtra o si Meta revoca el acceso.
- Mantener Cloudflare/ngrok solo para pruebas locales porque sus URLs cambian.
- Confirmar que existe la tabla `whatsapp_processed_messages` para evitar duplicados por reintentos de Meta.

### Diagnostico Seguro

Verificar variables sin imprimir secretos:

```bash
node -e "for (const k of ['WHATSAPP_PROVIDER','WHATSAPP_BUSINESS_SLUG','META_WHATSAPP_PHONE_NUMBER_ID','META_WHATSAPP_ACCESS_TOKEN','META_WHATSAPP_VERIFY_TOKEN']) console.log(k, process.env[k] ? 'set' : 'missing')"
```

Probar envio real sin exponer el token en consola:

```bash
curl -X POST "https://graph.facebook.com/v19.0/$META_WHATSAPP_PHONE_NUMBER_ID/messages" \
  -H "Authorization: Bearer $META_WHATSAPP_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"messaging_product":"whatsapp","to":"549XXXXXXXXXX","type":"text","text":{"body":"Prueba de WhatsApp API"}}'
```

Consultar ultimas conversaciones y mensajes procesados en Supabase:

```sql
select phone, state, last_message, updated_at
from whatsapp_conversations
order by updated_at desc
limit 10;

select message_id, phone, processed_at
from whatsapp_processed_messages
order by processed_at desc
limit 10;
```

## Limites Del MVP

- No hay IA generativa ni interpretacion libre.
- No hay promociones ni campañas marketing.
- No hay seleccion de distinto profesional por servicio.
- No hay upload de archivos ni notas por WhatsApp.
- No hay cancelacion/reprogramacion por WhatsApp todavia.
- `cancelar` solo cancela la conversacion en curso; no cancela turnos ya creados.
