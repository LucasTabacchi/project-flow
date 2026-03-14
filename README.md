# ProjectFlow

App web de gestion de proyectos tipo Trello, construida con `Next.js 16`, `React 19`, `TypeScript`, `Tailwind CSS`, `Prisma`, `Supabase Postgres`, `Zustand` y `dnd-kit`.

## Incluye

- Autenticacion segura con email y contrasena, sesiones HTTP-only persistidas y perfil de usuario
- Dashboard con resumen de tableros, proximas entregas e invitaciones pendientes
- Tableros con listas y tarjetas movibles por drag and drop
- Detalle de tarjeta con descripcion, prioridad, estado, fecha, checklist, comentarios y adjuntos por URL
- Miembros por tablero con roles `OWNER`, `EDITOR` y `VIEWER`
- Busqueda global con filtros
- Vista calendario de vencimientos
- Modo oscuro
- Seed de datos demo

## Stack

- Frontend: `Next.js App Router` + `React` + `TypeScript`
- Estilos: `Tailwind CSS v4`
- UI base: componentes reutilizables inspirados en `shadcn/ui`
- Backend: `Server Actions`
- Base de datos: `Supabase Postgres`
- ORM: `Prisma`
- Estado cliente: `Zustand`
- Drag and drop: `dnd-kit`
- Deploy objetivo: `Vercel`

## Configuracion con Supabase

### 1. Crear el proyecto

Creá un proyecto en Supabase y anotá:

- `PROJECT-REF`
- `REGION`
- la contraseña del usuario que vayas a usar con Prisma

### 2. Crear un usuario dedicado para Prisma

Recomendado para produccion. En el SQL Editor de Supabase ejecutá:

[`supabase/setup-prisma-role.sql`](C:\Users\lucas\Desktop\projectflow\supabase\setup-prisma-role.sql)

Después reemplazá `'replace_with_a_strong_password'` por una contraseña real y usá ese usuario en las URLs de conexion.

### 3. Variables de entorno

Creá `.env.local` a partir de `.env.example`.

```env
# Runtime en Vercel / serverless:
# Supavisor transaction pooler (puerto 6543) + pgbouncer=true + connection_limit=1
DATABASE_URL="postgresql://prisma.<PROJECT-REF>:<PASSWORD>@aws-0-<REGION>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# Prisma CLI / db push / migrations:
# Supavisor session pooler (puerto 5432)
DIRECT_URL="postgresql://prisma.<PROJECT-REF>:<PASSWORD>@aws-0-<REGION>.pooler.supabase.com:5432/postgres"

# Opcional: cambia el nombre por defecto de la cookie de sesion
SESSION_COOKIE_NAME="projectflow_session"
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

## Usuarios demo

- `sofia@projectflow.dev` / `Demo1234!`
- `diego@projectflow.dev` / `Demo1234!`
- `lucia@projectflow.dev` / `Demo1234!`

## Scripts utiles

- `npm run dev`: desarrollo local
- `npm run build`: build de produccion
- `npm run start`: servir build local
- `npm run lint`: chequeo ESLint
- `npm run typecheck`: chequeo TypeScript
- `npm run db:push`: sincronizar schema Prisma con Supabase
- `npm run db:migrate`: migraciones Prisma en local
- `npm run db:seed`: cargar seed demo
- `npm run db:studio`: abrir Prisma Studio

## Estructura

```text
src/
  app/
    (auth)/login, register
    (app)/dashboard, boards/[boardId], search, calendar, profile
    actions/
  components/
    auth/
    boards/
    calendar/
    dashboard/
    layout/
    profile/
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
```

## Notas tecnicas

- Prisma usa `DATABASE_URL` para el runtime y `DIRECT_URL` para operaciones CLI que requieren una conexion dedicada.
- El datasource ya esta configurado con `directUrl` en [`prisma/schema.prisma`](C:\Users\lucas\Desktop\projectflow\prisma\schema.prisma).
- Las sesiones usan el modelo `Session` de Prisma y una cookie opaca HTTP-only; el servidor resuelve siempre el usuario actual desde base de datos.
- El acceso a tableros siempre se valida del lado del servidor.
- Las mutaciones usan `Zod` y revalidan rutas afectadas.
- El board usa una frontera cliente acotada para `dnd-kit`; el resto de paginas se apoya en Server Components.
- Los adjuntos se modelan como links externos para mantener la app lista sin depender de storage externo.
- Si vas a usar solo Prisma y no el Data API de Supabase, podés desactivarlo desde Settings si querés simplificar la superficie expuesta.

## Deploy en Vercel

Definí estas variables en Vercel:

- `DATABASE_URL`
- `DIRECT_URL`
- `SESSION_COOKIE_NAME` opcional si querés cambiar el nombre por defecto de la cookie

Luego hacé deploy normal. El build ya fue validado con `next build`.

## Verificacion realizada

- `npx prisma generate`
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`
