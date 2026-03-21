# ProjectFlow

ProjectFlow es una app web de gestión de proyectos tipo Trello, construida con `Next.js 16`, `React 19`, `TypeScript`, `Tailwind CSS`, `Prisma`, `Supabase Postgres`, `Zustand` y `dnd-kit`.

## Qué incluye

- Autenticación con email y contraseña, sesiones HTTP-only persistidas y perfil de usuario
- Dashboard con resumen de tableros, próximas entregas e invitaciones pendientes
- Tableros con listas y tarjetas movibles por drag and drop
- Detalle de tarjeta con descripción, prioridad, estado, fecha límite, checklist, comentarios, historial, tiempo y adjuntos por URL
- Actividad del tablero y notificaciones personales
- Miembros por tablero con roles `OWNER`, `EDITOR` y `VIEWER`
- Invitaciones por email con enlace público de aceptación
- Búsqueda global con filtros
- Vista calendario de vencimientos
- Exportación de tableros a `CSV` y `PDF`
- Tarjetas recurrentes con cron diario
- Automatizaciones por reglas al cambiar el estado de una tarjeta
- Dependencias entre tarjetas
- Campos personalizados por tablero
- Reportes de tiempo:
  - estimado vs real
  - tiempo por miembro
  - tiempo por tablero
  - tarjetas con mayor desvío
- Notificaciones internas por email por tablero:
  - eventos seleccionados
  - recordatorios por vencimiento
  - recordatorios por próxima fecha límite
  - recordatorios por inactividad
  - recordatorios por bloqueos
- Modo oscuro
- Seed de datos demo

## Stack

- Frontend: `Next.js App Router` + `React` + `TypeScript`
- Estilos: `Tailwind CSS v4`
- UI base: componentes reutilizables sobre Radix UI
- Backend: `Server Actions` + Route Handlers
- Base de datos: `Supabase Postgres`
- ORM: `Prisma`
- Estado cliente: `Zustand`
- Drag and drop: `dnd-kit`
- Email transaccional: `Brevo`
- Tiempo real / colaboración multi-instancia: `Upstash Redis` opcional
- Deploy objetivo: `Vercel`

## Requisitos

- `Node.js 20+`
- Base PostgreSQL compatible con Prisma
- Cuenta de Supabase para la base
- Cuenta de Brevo si querés envío de emails

## Configuración con Supabase

### 1. Crear el proyecto

Creá un proyecto en Supabase y anotá:

- `PROJECT-REF`
- `REGION`
- la contraseña del usuario que vayas a usar con Prisma

### 2. Crear un usuario dedicado para Prisma

Recomendado para producción. En el SQL Editor de Supabase ejecutá:

`supabase/setup-prisma-role.sql`

Después reemplazá `'replace_with_a_strong_password'` por una contraseña real y usá ese usuario en las URLs de conexión.

### 3. Variables de entorno

Creá `.env.local` a partir de `.env.example`.

Variables principales:

```env
# Runtime Next.js / serverless
DATABASE_URL="postgresql://prisma.<PROJECT-REF>:<PASSWORD>@aws-0-<REGION>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# Prisma CLI / migrations
DIRECT_URL="postgresql://prisma.<PROJECT-REF>:<PASSWORD>@aws-0-<REGION>.pooler.supabase.com:5432/postgres"

# Opcional: nombre personalizado para la cookie de sesión
SESSION_COOKIE_NAME="projectflow_session"

# URL pública de la app
APP_URL="http://localhost:3000"

# Email con Brevo
BREVO_API_KEY="xkeysib-..."
EMAIL_FROM_ADDRESS="tu@email.com"
EMAIL_FROM_NAME="ProjectFlow"

# Redis opcional para colaboración multi-instancia y caché
UPSTASH_REDIS_REST_URL="https://YOUR-DB.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your_token_here"

# Requerido para cron jobs protegidos
CRON_SECRET="un-secreto-largo-y-aleatorio"
```

### 4. Sincronizar el schema

```bash
npx prisma generate
npm run db:push
```

### 5. Cargar datos demo

```bash
npm run db:seed
```

### 6. Levantar la app

```bash
npm run dev
```

## Scripts útiles

- `npm run dev`: desarrollo local
- `npm run build`: build de producción
- `npm run start`: servir build local
- `npm run lint`: chequeo ESLint
- `npm run typecheck`: chequeo TypeScript
- `npm run db:push`: sincronizar schema Prisma
- `npm run db:migrate`: migraciones Prisma en local
- `npm run db:seed`: cargar seed demo
- `npm run db:studio`: abrir Prisma Studio

## Funcionalidades principales

### Tableros y tarjetas

- Creación de tableros con miembros, roles y etiquetas
- Listas y tarjetas con drag and drop
- Estado, prioridad, fecha límite y tiempo estimado / registrado
- Checklists, comentarios, historial y adjuntos por URL
- Dependencias entre tarjetas para modelar bloqueos

### Automatización

- Reglas que reaccionan a cambios de estado
- Acciones disponibles:
  - mover a otra lista
  - asignar miembros
  - definir vencimiento en X días
  - enviar emails a destinatarios de la regla

### Recurrencia

- Tarjetas recurrentes configurables por tablero
- Materialización automática vía cron

### Emails internos

- Configuración por tablero de destinatarios y eventos
- Cola interna de envíos
- Recordatorios diarios por:
  - tarjeta vencida
  - vencimiento próximo
  - sin actividad hace X días
  - bloqueada hace X días

### Reportes

- Vista `/reports` con métricas server-side
- Agregados por miembro y por tablero
- Ranking de tarjetas con mayor desvío entre estimado y real

### Exportación

- Descarga de tablero en `CSV`
- Descarga de tablero en `PDF`

## Estructura

```text
src/
  app/
    (auth)/
    (app)/
    api/
    actions/
  components/
    auth/
    boards/
    calendar/
    dashboard/
    layout/
    profile/
    reports/
    search/
    ui/
  lib/
    auth/
    data/
    validators/
  stores/
prisma/
  schema.prisma
  seed.ts
supabase/
  setup-prisma-role.sql
vercel.json
```


