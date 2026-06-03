# Piloto controlado Achul_Nails con senas reales

## Objetivo

Este documento define como empezar una prueba real y controlada del sistema con `Achul_Nails`, usando clientas de confianza y senas reales por Mercado Pago.

La meta no es lanzar al publico todavia. La meta es validar la operacion diaria, detectar fricciones, revisar pagos, webhooks, WhatsApp y panel admin, y pulir el producto con uso real.

## Alcance del piloto

- Duracion recomendada: 7 a 14 dias.
- Negocio unico: `achul-nails`.
- Clientas iniciales: 5 a 10 personas de confianza.
- Link publico: `https://turnos-estetica.vercel.app/achul-nails`.
- Canal WhatsApp: usar solo si el bot ya responde correctamente a `hola`.
- No publicar masivamente en historias durante la primera semana.
- Efectivo: solo se acepta en el local y se carga con turno manual admin. Nunca por reserva publica ni por WhatsApp.

## Roles

| Persona | Responsabilidad |
|---------|-----------------|
| Tiago | Monitorear tecnica, pagos, webhooks, bugs y ajustes del sistema. |
| Admin Achul_Nails | Usar el panel todos los dias, revisar turnos y marcar asistencia. |
| Clientas piloto | Reservar por web o WhatsApp y avisar si algo no se entiende. |

## Checklist tecnico antes de abrir

### Vercel production

- Confirmar que la app abre: `https://turnos-estetica.vercel.app`.
- Confirmar que la reserva publica abre: `https://turnos-estetica.vercel.app/achul-nails`.
- Confirmar que `NEXT_PUBLIC_APP_URL` en Vercel Production sea `https://turnos-estetica.vercel.app`.

### Mercado Pago real

- Confirmar que `MERCADOPAGO_ACCESS_TOKEN_ACHUL` corresponde a la cuenta que debe cobrar.
- Confirmar webhook en Mercado Pago:
  - `https://turnos-estetica.vercel.app/api/mercado-pago/webhook`
- Hacer una reserva real de bajo riesgo.
- Verificar que el turno pase de `pending_payment` a `confirmed`.
- Verificar en Mercado Pago que la sena entro en la cuenta correcta.

### WhatsApp

- Enviar `hola` al bot.
- Confirmar que responde con servicios.
- Confirmar webhook en Meta:
  - `https://turnos-estetica.vercel.app/api/whatsapp/webhook`
- Confirmar que el campo `messages` esta suscrito.
- Confirmar que `/admin/whatsapp` muestra el chat.
- Probar `Reiniciar chat` solo si la conversacion queda trabada.

### Admin

- Entrar a `https://turnos-estetica.vercel.app/admin/turnos`.
- Entrar con email y contrasena de administradora.
- Ver turnos.
- Abrir detalle.
- Marcar `Asistio`, `No asistio` o `Cancelar` en un turno de prueba.
- Reprogramar un turno de prueba.
- Crear un turno manual sin sena.
- Crear un turno manual con sena en efectivo.
- Confirmar que el inicio `/admin` muestra turnos de hoy, pendientes y chats a revisar.

### Configuracion de Achul_Nails

- Revisar servicios reales: nombre, duracion, precio y sena.
- Revisar horarios reales de atencion.
- Revisar bloqueos o dias sin atencion.
- Revisar personalizacion: logo, texto de portada y tema visual.
- Revisar que multi-servicio tenga sentido para los servicios cargados.

## Dia 0: prueba interna final

Hacer estas pruebas antes de invitar clientas:

| Prueba | Resultado esperado |
|--------|--------------------|
| Reserva web con sena real | Turno `confirmed` despues del pago. |
| Reserva WhatsApp con sena real | Link de Mercado Pago generado y turno visible en admin. |
| Turno manual sin sena | Turno creado, bloquea horario y no crea payment. |
| Turno manual con sena en efectivo | Turno creado, bloquea horario y payment `cash` aprobado. |
| Admin turnos | Todos los turnos aparecen con cliente, servicio, horario e importes. |
| Admin WhatsApp | El chat aparece y puede reiniciarse sin tocar turnos. |
| Hold abandonado | Se libera automaticamente despues de 30 minutos por el job de expiracion. |

No avanzar a clientas piloto si falla algo de dinero, confirmacion de pago o disponibilidad.

## Dias 1 a 3: clientas de confianza

Invitar pocas clientas y pedirles que usen el sistema normalmente.

Texto sugerido para enviar:

```text
Hola, ya estamos probando el sistema nuevo de turnos. Saca tu turno aca: https://turnos-estetica.vercel.app/achul-nails. Para reservar se paga una sena por Mercado Pago.
```

Revisar todos los dias:

- Turnos `pending_payment`.
- Turnos `confirmed`.
- Pagos aprobados en Mercado Pago.
- Chats trabados en `/admin/whatsapp`.
- Horarios ocupados correctamente.
- Si alguna clienta no entendio un paso.

## Dias 4 a 7: ajuste fino

En esta etapa conviene corregir solo lo que afecta la experiencia real:

- Textos confusos.
- Duracion de servicios.
- Precio o sena.
- Horarios de atencion.
- Bloqueos.
- Orden de servicios.
- Pasos del bot donde varias clientas se confundan.

No conviene agregar funcionalidades grandes durante la primera semana salvo que haya un bloqueo critico.

## Rutina diaria para la admin

Al empezar el dia:

1. Abrir `/admin/turnos`.
2. Revisar turnos del dia.
3. Revisar si hay turnos `pending_payment`.
4. Confirmar que los horarios del dia esten correctos.

Durante el dia:

1. Crear turno manual si una clienta paga efectivo en el local.
2. Revisar `/admin/whatsapp` si una clienta dice que el bot quedo trabado.
3. No borrar turnos ni pagos reales.

Al terminar el dia:

1. Marcar `Asistio` o `No asistio`.
2. Anotar problemas encontrados.
3. Avisar a Tiago si hubo error con pago, horario duplicado o bot trabado.

## Registro de problemas

Usar una lista simple. Lo importante es guardar contexto, no escribir perfecto.

| Fecha | Cliente | Canal | Que intento hacer | Que salio mal | Captura | Estado | Accion tomada |
|-------|---------|-------|-------------------|---------------|---------|--------|---------------|
| | | Web / WhatsApp / Admin | | | Si / No | Abierto / Resuelto | |

Ejemplos de problemas utiles:

- "No entendio que tenia que tocar Confirmar y pagar".
- "Pago, pero el turno quedo pending_payment".
- "El horario seguia apareciendo disponible".
- "El bot quedo esperando email".
- "El admin no sabia donde marcar asistencia".

## Criterios de piloto aprobado

El piloto puede considerarse aprobado cuando:

- Hay al menos 5 reservas reales completadas sin intervencion tecnica.
- Mercado Pago confirma pagos y los turnos quedan `confirmed`.
- Tu hermana entiende como ver turnos y marcar asistencia.
- Al menos una reserva por WhatsApp llega correctamente al link de pago.
- No aparecen dobles reservas en el mismo horario.
- Los horarios abandonados por falta de pago no quedan bloqueados indefinidamente.
- Los errores encontrados son de texto, configuracion o UX, no de dinero ni disponibilidad.

## Riesgos y controles

### Login admin

El panel debe usarse con email y contrasena de administradora. No compartir el usuario fuera de la persona que opera Achul_Nails.

### Numero de WhatsApp de prueba

Sirve para QA. Para clientas reales conviene pasar a un numero real de WhatsApp Business.

Si todavia se usa numero de prueba, limitar el piloto a personas que puedan escribir a ese numero.

### Emails

Si `RESEND_API_KEY` no esta configurado en produccion, depender de WhatsApp, Mercado Pago y el panel admin como evidencia principal.

Antes de abrir a mas clientas, configurar Resend real.

### Pagos reales

Usar senas reales desde el piloto, pero no probar montos grandes hasta confirmar el primer flujo completo.

Siempre verificar manualmente en Mercado Pago que el dinero entra en la cuenta correcta.

## Evidencia a guardar

Para cada prueba importante, guardar:

- Captura del turno en `/admin/turnos`.
- Estado del turno.
- Appointment id si hace falta investigarlo.
- Payment id o comprobante en Mercado Pago.
- Captura del chat de WhatsApp si la reserva fue por bot.
- Captura del problema si una clienta se trabo.

## Cierre del piloto

Al final de la primera semana, revisar:

- Cuantas reservas reales se hicieron.
- Cuantas fueron web y cuantas WhatsApp.
- Cuantos pagos quedaron pendientes.
- Si hubo doble reserva.
- Donde se confundieron las clientas.
- Que necesita tu hermana para operar mas tranquila.

Despues de ese cierre, decidir si conviene:

- Abrir a mas clientas.
- Pasar a numero real de WhatsApp Business.
- Configurar Resend real.
- Implementar login admin real.
- Mejorar reprogramacion/cancelacion desde admin.
