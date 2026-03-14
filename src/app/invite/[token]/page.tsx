import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  CircleX,
  LogOut,
  Mail,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import { logoutAction } from "@/app/actions/auth";
import { InvitationTokenActions } from "@/components/invitations/invitation-token-actions";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth/session";
import { getInvitationAccessData } from "@/lib/data/invitations";
import { formatFullDate, getBoardTheme, getRoleLabel } from "@/lib/utils";

type InvitationPageProps = {
  params: Promise<{
    token: string;
  }>;
};

const invitationStatusLabels = {
  ACCEPTED: "Aceptada",
  DECLINED: "Rechazada",
  EXPIRED: "Vencida",
  PENDING: "Pendiente",
} as const;

function buildAuthHref(pathname: string, redirectTo: string, email?: string) {
  const params = new URLSearchParams();
  params.set("redirectTo", redirectTo);

  if (email) {
    params.set("email", email);
  }

  return `${pathname}?${params.toString()}`;
}

export default async function InvitationPage({ params }: InvitationPageProps) {
  const [{ token }, currentUser] = await Promise.all([params, getCurrentUser()]);
  const invitation = await getInvitationAccessData(token);

  if (!invitation) {
    return (
      <div className="flex min-h-[75vh] items-center justify-center px-4 py-10">
        <div className="glass-panel w-full max-w-2xl rounded-[32px] border border-border p-8">
          <Badge variant="secondary">Invitación no disponible</Badge>
          <h1 className="mt-4 font-display text-4xl font-semibold">
            Este enlace ya no es válido.
          </h1>
          <p className="mt-3 text-muted-foreground">
            Puede que la invitación haya sido revocada, que el tablero ya no exista o
            que el enlace esté incompleto.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:-translate-y-0.5"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-secondary px-4 text-sm font-semibold text-secondary-foreground transition hover:bg-secondary/80"
            >
              Ir al dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const theme = getBoardTheme(invitation.boardTheme);
  const emailMatches = currentUser?.email === invitation.email;
  const loginHref = buildAuthHref("/login", `/invite/${token}`, invitation.email);
  const registerHref = buildAuthHref("/register", `/invite/${token}`, invitation.email);

  return (
    <div className="mx-auto flex min-h-[80vh] w-full max-w-4xl items-center px-4 py-10 sm:px-6">
      <div className="grid w-full gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="glass-panel rounded-[32px] border border-border p-8">
          <Badge className={theme.chipClass}>Invitación a tablero</Badge>
          <h1 className="mt-4 font-display text-4xl font-semibold">
            {invitation.boardName}
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            {invitation.invitedByName} te invitó a sumarte a este tablero en
            ProjectFlow con el rol inicial de {getRoleLabel(invitation.role).toLowerCase()}.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[24px] border border-border bg-background/70 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Invitación para
              </p>
              <p className="mt-2 font-semibold">{invitation.email}</p>
            </div>
            <div className="rounded-[24px] border border-border bg-background/70 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Vencimiento
              </p>
              <p className="mt-2 font-semibold">{formatFullDate(invitation.expiresAt)}</p>
            </div>
          </div>

          <div className="mt-8 rounded-[28px] border border-border bg-secondary/35 p-5">
            {invitation.status === "ACCEPTED" ? (
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 size-5 text-emerald-500" />
                <div>
                  <p className="font-semibold">Esta invitación ya fue aceptada.</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Si seguís teniendo acceso con esta cuenta, podés abrir el tablero
                    directamente.
                  </p>
                </div>
              </div>
            ) : null}

            {invitation.status === "DECLINED" ? (
              <div className="flex items-start gap-3">
                <CircleX className="mt-0.5 size-5 text-rose-500" />
                <div>
                  <p className="font-semibold">Esta invitación fue rechazada.</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Si necesitás volver a ingresar, el propietario puede enviarte una
                    nueva invitación.
                  </p>
                </div>
              </div>
            ) : null}

            {invitation.status === "EXPIRED" ? (
              <div className="flex items-start gap-3">
                <TriangleAlert className="mt-0.5 size-5 text-amber-500" />
                <div>
                  <p className="font-semibold">La invitación venció.</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Pedile al propietario del tablero que te envíe un nuevo enlace.
                  </p>
                </div>
              </div>
            ) : null}

            {invitation.status === "PENDING" && !currentUser ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 size-5 text-primary" />
                  <div>
                    <p className="font-semibold">Primero necesitás identificarte.</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Ingresá o creá una cuenta con <strong>{invitation.email}</strong>{" "}
                      para aceptar esta invitación desde el mismo enlace.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href={loginHref}
                    className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:-translate-y-0.5"
                  >
                    Iniciar sesión
                  </Link>
                  <Link
                    href={registerHref}
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-secondary px-4 text-sm font-semibold text-secondary-foreground transition hover:bg-secondary/80"
                  >
                    Crear cuenta
                  </Link>
                </div>
              </div>
            ) : null}

            {invitation.status === "PENDING" && currentUser && !emailMatches ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 size-5 text-primary" />
                  <div>
                    <p className="font-semibold">Estás con otra cuenta.</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Esta invitación fue emitida para <strong>{invitation.email}</strong>,
                      pero ahora estás autenticado como <strong>{currentUser.email}</strong>.
                    </p>
                  </div>
                </div>
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-border bg-secondary px-4 text-sm font-semibold text-secondary-foreground transition hover:bg-secondary/80"
                  >
                    <LogOut className="size-4" />
                    Cerrar sesión y cambiar de cuenta
                  </button>
                </form>
              </div>
            ) : null}

            {invitation.status === "PENDING" && currentUser && emailMatches ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 size-5 text-emerald-500" />
                  <div>
                    <p className="font-semibold">Todo listo para responder.</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Estás autenticado con el email correcto. Podés aceptar o
                      rechazar la invitación ahora mismo.
                    </p>
                  </div>
                </div>
                <InvitationTokenActions
                  boardId={invitation.boardId}
                  token={invitation.token}
                />
              </div>
            ) : null}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="glass-panel rounded-[32px] border border-border p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Resumen
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Tablero</p>
                <p className="font-semibold">{invitation.boardName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Invitó</p>
                <p className="font-semibold">{invitation.invitedByName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rol inicial</p>
                <p className="font-semibold">{getRoleLabel(invitation.role)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estado</p>
                <Badge className={theme.chipClass}>
                  {invitationStatusLabels[invitation.status]}
                </Badge>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-[32px] border border-border p-6">
            <p className="text-sm text-muted-foreground">
              Si ya pertenecés al tablero o la invitación fue aceptada antes, podés
              abrir el espacio de trabajo directamente.
            </p>
            <Link
              href={`/boards/${invitation.boardId}`}
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary"
            >
              Ir al tablero
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
