# Explicación del Proyecto: Turnos Estética

## 🎯 ¿Qué es el Proyecto?

**Turnos Estética** es una plataforma web para que negocios de estética (salones de belleza, peluquerías, etc.) puedan:
1. Permitir que sus clientes reserves turnos en línea
2. Cobrar una seña (depósito) a través de Mercado Pago
3. Reducir las "inasistencias" (clientes que no asisten sin avisar)

En palabras simples: **Es un sistema de reserva de turnos con pago por adelantado para evitar que la gente no vaya**.

---

## 🏗️ ¿Cómo Funciona el Proyecto Actualmente?

### **La Vista de una Clienta (El Flujo Público)**

```
1. La clienta entra a: mimasaje.com/turnos
2. Elige qué servicio quiere (ej: "Manicura", "Masaje", "Depilación")
3. Si hay, elige qué profesional prefiere
4. Ve los horarios disponibles (ej: lunes 14:00, martes 10:30, etc.)
5. Selecciona un horario
6. Completa sus datos: nombre, teléfono, email
7. Paga la seña con Mercado Pago Checkout
8. Recibe email de confirmación
9. Turno queda registrado en la agenda del negocio
```

**¿Qué está funcionando?**
- ✅ El sitio público muestra los servicios disponibles
- ✅ Se calculan automáticamente los horarios libres (basado en duración del servicio, profesional disponible, etc.)
- ✅ Se crea un turno provisional mientras la clienta paga
- ✅ Se integra con Mercado Pago Checkout Pro
- ✅ Cuando Mercado Pago confirma que se pagó, el turno queda confirmado
- ✅ Si el pago se rechaza, se libera el horario para que otra persona lo reserve
- ✅ Se envía email de confirmación a la clienta

**Ejemplo técnico:**
- Base de datos (Supabase) guarda: cliente, servicio, profesional, horario, monto pagado
- Sistema valida que no haya dos personas al mismo horario
- Si Mercado Pago dice "pago rechazado", libera ese horario automáticamente

---

### **La Vista de la Administradora (El Panel Admin)**

La persona que maneja el negocio puede entrar a un panel privado para:

**¿Qué está funcionando?**
- ✅ Crear servicios (nombre, duración, precio, cantidad de seña)
- ✅ Crear profesionales y asignarles servicios
- ✅ Configurar horarios de atención (ej: "lunes a viernes 9:00 a 17:00")
- ✅ Bloquear períodos de tiempo (ej: "no me atiendo en enero")
- ✅ Ver todos los servicios, profesionales y horarios creados

**¿Qué NO está funcionando aún?**
- ❌ Ver la lista de turnos confirmados
- ❌ Crear turnos manuales (para clientes que reservan por teléfono)
- ❌ Marcar si un cliente asistió o no asistió
- ❌ Ver cuánto dinero falta cobrar (si la seña fue $50 y el total es $120)

---

## 🔧 La Arquitectura Técnica (Para Desarrolladores)

### **Tecnologías Usadas**

```
Frontend:  Next.js 14 + React + TypeScript
Backend:   Next.js API Routes (serverless)
Database:  Supabase (PostgreSQL)
Pagos:     Mercado Pago
Email:     Resend
Testing:   Vitest + Playwright
```

### **Cómo se Comunican**

1. **Clienta abre el sitio público** → Browser hace request a `GET /api/public/businesses/[negocio]/availability`
2. **Backend calcula horarios libres** → Consulta la DB (Supabase)
3. **Clienta hace click en "Reservar"** → Browser hace request a `POST /api/bookings`
4. **Backend crea turno provisional** → Guarda en DB con estado "pending_payment"
5. **Mercado Pago genera link de pago** → Clienta paga
6. **Mercado Pago avisa al backend** → Webhook a `POST /api/mercado-pago/webhook`
7. **Backend confirma turno** → Cambia estado a "confirmed"
8. **Backend envía email** → Usa el servicio Resend

### **Carpetas y Qué Hacen**

```
app/
├── [businessSlug]/        ← Página pública de cada negocio
├── admin/                 ← Panel administrador (privado)
│   ├── servicios/        ← Gestión de servicios
│   ├── profesionales/    ← Gestión de profesionales
│   └── agenda/           ← Configurar horarios y bloqueos
└── api/                  ← Endpoints del servidor
    ├── bookings/         ← Crear/gestionar reservas
    ├── admin/            ← Endpoints admin
    └── mercado-pago/     ← Webhook de pagos

components/
├── booking/              ← Componentes de la reserva pública
│   ├── service-selector.tsx      ← Elegir servicio
│   ├── slot-picker.tsx           ← Elegir horario
│   └── customer-form.tsx         ← Completar datos
└── admin/                ← Componentes del panel admin
    ├── admin-services-panel.tsx
    └── availability-block-form.tsx

lib/
├── booking/              ← Lógica de reservas (estado, confirmación)
├── payments/             ← Integración Mercado Pago
├── notifications/        ← Sistema de notificaciones
├── availability/         ← Cálculo de horarios libres
└── domain/types.ts       ← Definiciones de tipos

supabase/
└── migrations/           ← Definición de la base de datos
```

---

## 📊 ¿Qué Porcentaje del Proyecto Está Completado?

### **Resumen por Fase**

| Fase | Descripción | Estado | % |
|------|-------------|--------|-----|
| **Phase 1** | Setup (proyecto, configuración, herramientas) | ✅ Completada | 100% |
| **Phase 2** | Foundation (base de datos, servicios compartidos) | ✅ Completada | 100% |
| **Phase 3** | User Story 1: Cliente reserva con seña | ✅ Completada | 100% |
| **Phase 4** | User Story 2: Admin configura agenda | ✅ Completada | 100% |
| **Phase 5** | User Story 3: Admin gestiona turnos | ✅ Completada | 100% |
| **Phase 6** | Polish, E2E, deploy y WhatsApp MVP | 🔄 En Progreso | 85% |

### **Total: 90% Completado para demo/piloto**

---

## 📋 ¿Qué Falta por Hacer?

### **User Story 3: Gestión de Turnos (La Parte Que Falta)**

La administradora del negocio necesita poder:

#### 1. **Ver los Turnos (Estado)**
> Correccion aplicada: la busqueda por cliente ahora usa join interno con `customers`, y el listado normaliza relaciones devueltas como objeto o array.

- [x] Crear página `/admin/turnos` que muestre lista de turnos confirmados — Implementado en [app/admin/turnos/page.tsx](app/admin/turnos/page.tsx#L1-L200)
- [x] Filtrar por fecha, estado, profesional — Implementado (selector de profesional por nombre, filtros por `date` y `status`, paginación)
- [x] Ver datos de la cliente (nombre, teléfono, email) — Implementado en [components/admin/admin-turnos-list.tsx](components/admin/admin-turnos-list.tsx#L1-L200)
- [x] Búsqueda por nombre de cliente — Implementado (`clientName` filter en la página)
- [x] Busqueda corregida con join `customers!inner` para filtrar por cliente sin perder datos relacionados

#### 2. **Crear Turnos Manuales (Completado y corregido)**
> Correccion aplicada: el endpoint ya no acepta `x-admin: true`; requiere `Authorization: Bearer <ADMIN_API_KEY>` o cookie `admin_api_key` validada en servidor. El formulario permite crear turnos sin sena o con sena pagada en efectivo.

- [x] Formulario para crear turno sin pago (para clientes que se acercan al local a pagar en efectivo) — Implementado en [components/admin/manual-appointment-form.tsx](components/admin/manual-appointment-form.tsx#L1-L200)
- [x] este formulario manual debe ser visible solamente para administradores no para la persona que reserva — El formulario está en la sección admin (`/admin/turnos`). El endpoint acepta ahora:
   - `Authorization: Bearer <ADMIN_API_KEY>` (recomendado). Ahora también se puede guardar el token desde el panel admin: en la página `/admin/turnos` hay un formulario para ingresar la `ADMIN_API_KEY` que se guarda en `localStorage` y en una cookie (`admin_api_key`) para llamadas automáticas desde el navegador.
- [x] El turno manual debe bloquear ese horario así como los pagados — Implementado: la inserción en la tabla `appointments` respeta la constraint de exclusión y fallará si el slot ya está ocupado
- [x] Endpoint API para crear estos turnos — Implementado en [app/api/admin/appointments/manual/route.ts](app/api/admin/appointments/manual/route.ts#L1-L200)
- [x] Resultado final, este formulario es para las personas que no sacaron tunso online y quieren pagar en efectivo la seña, se deben acercar al local a pagar por lo tanto solo los administradores pueden ver este formulario y recibirle el efectivo — Workflow implementado (registro de pago en `payments` con provider `cash`)

#### 3. **Marcar Asistencia (Completado)**
- [x] Abrir detalle del turno
- [x] Boton para marcar "Asistio" o "No asistio"
- [x] Endpoint API para guardar el estado

#### 4. **Ver Cuanto Cobrar (Completado)**
- [x] Mostrar: Precio Total, Sena Pagada, Saldo Restante
- [x] Usar la logica de calculo para restar automaticamente la sena del total

#### 5. **Tests e Integración (Falta completar)**
- [x] Tests automatizados para verificar que los turnos manuales funcionan
- [x] Tests para verificar cambios de estado
- [x] Documentacion de las nuevas features

#### 6. **Polish Final (Falta completar)**
- [x] End-to-end test que simule: reserva -> pago -> confirmacion -> admin ve turno
- [ ] Verificar que todos los tests pasen
- [ ] Validar casos especiales (qué pasa si la admin bloquea un horario que tenía un turno pendiente, etc.)

---

## 🎯 Las 3 "Historias de Usuario" (MVPs Pequeños)

### **✅ Historia 1: Cliente Reserva con Seña (LISTA)**
- La cliente ve horarios disponibles
- Paga una seña con Mercado Pago
- Recibe confirmación por email
- **Beneficio**: El cliente no puede "no-show" sin perder dinero

### **✅ Historia 2: Admin Configura Agenda (LISTA)**
- Admin crea servicios, profesionales, horarios semanales
- Admin puede bloquear períodos
- La agenda pública se actualiza automáticamente
- **Beneficio**: Sin necesidad de desarrollador para cada cambio

### **✅ Historia 3: Admin Gestiona Turnos (COMPLETA)**
- Admin ve todos los turnos confirmados
- Puede crear turnos manuales (teléfono, cliente frecuente, etc.)
- Marca quién asistió / no asistió
- Ve cuánto dinero cobró y cuánto falta
- **Beneficio**: Cierra el ciclo operativo del negocio

---

## 🧪 ¿Qué Se Ha Probado?

### **Pruebas Que Pasan ✅**
- Contract tests (verifican que los endpoints devuelven el formato correcto)
- Integration tests (prueban flujos completos: reserva → pago → confirmación)
- Unit tests (prueban funciones pequeñas, como cálculo de disponibilidad)
- Manual testing con datos reales de Mercado Pago

### **Pruebas Que Faltan ❌**
- Tests para gestión de turnos (User Story 3)
- End-to-end test completo (desde usuario final)

---

## 🚀 ¿Cómo se Usa Esto en la Práctica?

### **Para el Cliente Final (La Esteticien)**

1. Configura su negocio en el panel admin:
   ```
   - Creo servicio "Manicura" (60 min, $100, seña $30)
   - Creo "Mariana" como profesional
   - Le asigno manicura
   - Configuro: Lunes a Viernes 9:00-18:00
   - Bloqueo vacaciones: 1 al 15 de Enero
   ```

2. Comparte el link público: `https://turnosestetica.com.ar/mimasaje`

3. Las clientas reservan online, pagan seña, reciben email

4. Mariana ve los turnos en el panel admin (cuando termine la Story 3)

### **Para el Servidor (Operaciones)**

- Cada negocio es un "tenant" (inquilino) separado
- Credenciales de Mercado Pago por negocio (configuradas por admin del sistema)
- Base de datos centralizada en Supabase
- Emails a través de Resend

---

## 🔐 Seguridad y Consideraciones

### **Cómo Protegemos la Info**
- Solo el admin del negocio puede ver/editar su propia agenda
- Los pagos van directo a Mercado Pago (no guardamos tarjetas)
- Contraseñas protegidas (validación en backend, no frontend)
- URLs privadas del admin requieren autenticación

### **Casos Especiales Manejados**
- ✅ Dos clientes reservan el mismo horario → El segundo recibe error
- ✅ Pago rechazado → Horario se libera automáticamente
- ✅ Pago expira → Horario se libera automáticamente
- ✅ Admin bloquea un período → Los turnos pendientes deben evaluarse
- ✅ Servicio cambia duración → Nuevos turnos usan nueva duración

### Cambios recientes realizados por el asistente

- **Guard del endpoint:** El endpoint de creacion de turnos manuales ahora acepta `Authorization: Bearer <ADMIN_API_KEY>` o cookie `admin_api_key`; el header legacy `x-admin` fue eliminado. Archivo: [app/api/admin/appointments/manual/route.ts](app/api/admin/appointments/manual/route.ts)
- **Guardar clave desde el panel:** Se agregó `components/admin/admin-api-key-form.tsx` — un formulario que guarda la `ADMIN_API_KEY` en `localStorage` y en la cookie `admin_api_key` (30 días) para llamadas automáticas desde el panel.
- **Manual form actualizado:** `components/admin/manual-appointment-form.tsx` envia ahora la cabecera `Authorization: Bearer <token>` tomada de `localStorage` o de la cookie, sin fallback de desarrollo.
- **UI:** `app/admin/turnos/page.tsx` muestra el formulario de clave arriba del formulario de creación manual para que el admin pueda guardar el token desde el panel.
- **Documentación:** Este mismo documento (`explicacion.md`) se actualizó para indicar cómo configurar `ADMIN_API_KEY` y cómo se usa desde el panel.

Cómo usar (rápido): entra a `/admin/turnos`, pega el token en el formulario de "Clave Admin" y guarda; después el botón "Crear turno manual" enviará la cabecera `Authorization` automáticamente.

Recomendación inmediata: migrar este flujo a una de estas opciones según el nivel de seguridad deseado:
- Opción 2 — Guardar token de forma segura en servidor y exponer un endpoint que establezca una cookie `HttpOnly` para el panel (más seguro que almacenarlo en localStorage).
- Opción 3 — Integrar Supabase Auth y usar sesiones/RLS para eliminar por completo la clave estática.

---

## 📝 ¿Cómo Continuar?

### **Próximos Pasos (En Orden)**

1. **Completar Story 3 (Gestión de Turnos)**
   - Implementar página de turnos en admin
   - Crear endpoint para marcar asistencia
   - Agregar formulario de turno manual
   - Mostrar saldo a cobrar

2. **Pruebas Finales**
   - Todos los tests deben pasar
   - End-to-end desde usuario público hasta admin

3. **Documentación**
   - Cómo hacer un deploy
   - Cómo agregar nuevo negocio
   - Cómo integrar WhatsApp (diseño, para Phase 2)

4. **Phase 2 (Después del MVP)**
   - OAuth de Mercado Pago (onboarding automático)
   - Notificaciones por WhatsApp
   - Analytics y reportes
   - API pública para integraciones

---

## 📊 Diagrama del Flujo Completo

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENTE FINAL                            │
│  Entra a: mimasaje.com/turnos                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  Elige servicio y horario     │
        │  (Backend calcula disponibles)│
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  Completa datos personales    │
        │  Backend crea "pending_payment"│
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  Redirect a Mercado Pago      │
        │  Cliente paga ($30 seña)      │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  Mercado Pago aprueba pago   │
        │  Webhook POST al backend      │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  Backend cambia estado        │
        │  a "confirmed"               │
        │  Envía email de confirmación  │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  TURNO CONFIRMADO            │
        │  Cliente recibe email         │
        │  Horario ya no está disponible│
        └──────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    ADMIN (Story 3 - EN PROGRESO)            │
│  Entra a: mimasaje.com/admin/turnos                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  Ve lista de turnos:          │
        │  - Cliente: María             │
        │  - Servicio: Manicura         │
        │  - Profesional: Mariana       │
        │  - Horario: Mar 14:00         │
        │  - Seña: $30 pagada           │
        │  - Total: $100                │
        │  - Saldo: $70                 │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  Puede:                       │
        │  ✅ Marcar asistencia         │
        │  ✅ Crear turno manual        │
        │  ✅ Ver saldo a cobrar        │
        └──────────────────────────────┘
```

---

## 🎓 Resumen en 30 Segundos

**Turnos Estética** es un sistema de reserva online para salones de belleza.

- **Clientes**: Reservan turno, eligen horario, pagan seña, reciben email
- **Admin**: Configura servicios/horarios, ve turnos, marca asistencia
- **Ventaja**: Clientes pagan por adelantado → Menos no-shows

**Progreso**: 90% completado para demo/piloto
- ✅ Clientes pueden reservar y pagar (100%)
- ✅ Admin puede configurar agenda (100%)
- ✅ Admin puede gestionar turnos (100%)
- ✅ WhatsApp MVP y panel operativo funcionando
- 🔄 Pendiente: auth robusta, numero real WhatsApp, Resend real, Mercado Pago OAuth y soporte avanzado

**Próximo paso**: Robustecer el piloto para produccion real con autenticacion, numero real de WhatsApp y configuracion por negocio.

---

## 📞 Contacto y Preguntas

Este documento explica el estado actual del proyecto. Para detalles técnicos específicos, ver:
- `specs/001-mvp-anti-inasistencias/spec.md` - Especificación completa
- `specs/001-mvp-anti-inasistencias/tasks.md` - Lista detallada de tareas
- `docs/HANDOFF.md` - Instrucciones para continuar el desarrollo
## Estado actual recomendado para demo (2026-06-02)

El MVP ya esta listo para una demo operativa local y de produccion controlada:

- Cliente web: reserva publica, calendario, multi-servicio, pago de sena por Mercado Pago y confirmacion por webhook.
- Admin: agenda, servicios, profesionales, bloqueos, turnos, detalle, asistencia/no-show/cancelacion, turnos manuales y saldo a cobrar.
- WhatsApp MVP: bot guiado con mensajes interactivos, seleccion de servicios, profesional, dia, horario, resumen y link de pago.
- Operacion WhatsApp: `/admin/whatsapp` permite ver chats recientes, entender el paso actual y reiniciar conversaciones trabadas sin tocar turnos ni pagos.
- Deploy estable: Vercel production en `https://turnos-estetica.vercel.app`.

Pendientes reales para pasar de demo/piloto a producto mas robusto:

- Reemplazar `ADMIN_API_KEY` por autenticacion real para admins.
- Registrar un numero real de WhatsApp Business; el numero de prueba sirve para QA.
- Configurar Resend real para fallback de email en produccion.
- Implementar Mercado Pago OAuth para que cada negocio conecte su cuenta.
- Agregar panel avanzado de WhatsApp: historial de mensajes, copy configurable, reprogramacion/cancelacion y soporte operativo.
