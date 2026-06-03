# Guia corta para administrar Achul_Nails

Esta guia es para operar el panel sin tocar configuraciones tecnicas.

## 1. Entrar al panel

1. Abrir `https://turnos-estetica.vercel.app/admin/login`.
2. Ingresar con el email y contrasena de administradora.
3. Desde el inicio, revisar:
   - turnos de hoy;
   - pendientes de pago;
   - chats de WhatsApp a revisar.

## 2. Ver turnos

1. Ir a `Turnos`.
2. Filtrar por fecha si hace falta.
3. Abrir `Ver detalle` para revisar cliente, servicios, sena, saldo y notas.

Estados importantes:

- `pending_payment`: la clienta todavia no termino de pagar.
- `confirmed`: turno confirmado.
- `attended`: asistio.
- `no_show`: no asistio.
- `cancelled`: cancelado.

## 3. Marcar asistencia

Al terminar el dia:

1. Abrir el detalle del turno.
2. Tocar `Asistio` o `No asistio`.
3. No cambia pagos ni saldos; solo deja registro operativo.

## 4. Crear turno manual

Usar solo cuando la reserva se toma en el local o por fuera del flujo online.

1. Ir a `Turnos`.
2. En `Crear turno manual`, elegir uno o mas servicios.
3. Elegir profesional, fecha y hora.
4. Cargar nombre, telefono y email si lo tiene.
5. Elegir:
   - `Sin sena`, si no pago nada todavia.
   - `Sena pagada en efectivo`, si recibiste efectivo en el local.

El efectivo nunca se acepta por WhatsApp ni por la reserva publica.

## 5. Reprogramar o cancelar

Para reprogramar:

1. Abrir `Ver detalle`.
2. En `Reprogramar a`, elegir nueva fecha y hora.
3. Guardar.

Para cancelar:

1. Abrir `Ver detalle`.
2. Tocar `Cancelar`.

Reprogramar o cancelar no devuelve dinero automaticamente. Si hay que devolver una sena, se gestiona aparte en Mercado Pago o en el local.

## 6. Revisar WhatsApp

Si una clienta dice que el bot quedo trabado:

1. Ir a `WhatsApp`.
2. Buscar el telefono.
3. Abrir detalle.
4. Si esta vencido o trabado, tocar `Reiniciar chat`.
5. Pedirle a la clienta que escriba `hola` de nuevo.

Reiniciar chat no cancela turnos ni pagos ya creados.

## 7. Problemas que hay que avisar

Avisar a Tiago si pasa cualquiera de estos casos:

- La clienta pago, pero el turno quedo `pending_payment`.
- Un horario ocupado sigue apareciendo disponible.
- Dos clientas tienen el mismo horario.
- Mercado Pago cobro en una cuenta incorrecta.
- WhatsApp genera link de pago pero no aparece el turno.
- El panel no permite entrar con el email de administradora.
