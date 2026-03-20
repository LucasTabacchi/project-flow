import {
  ArrowRight,
  KanbanSquare,
} from "lucide-react";

import { ThemeToggle } from "@/components/layout/theme-toggle";

type AsideLink = {
  href: string;
  label: string;
};

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  asideLink?: AsideLink;
  showDemoCredentials?: boolean;
};

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  asideLink,
  showDemoCredentials = false,
}: AuthShellProps) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[1fr_minmax(24rem,38rem)]">

      {/* ── LEFT: dark immersive panel ── */}
      <section className="relative hidden overflow-hidden bg-[#080f1a] lg:flex lg:flex-col">

        {/* Layered geometric background */}
        <div className="absolute inset-0">
          {/* Deep gradient base */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_10%,rgba(13,148,136,0.22),transparent),radial-gradient(ellipse_60%_80%_at_80%_90%,rgba(234,88,12,0.16),transparent),radial-gradient(ellipse_50%_50%_at_50%_50%,rgba(6,182,212,0.06),transparent)]" />

          {/* Animated mesh rings */}
          <div className="auth-ring auth-ring-1" />
          <div className="auth-ring auth-ring-2" />
          <div className="auth-ring auth-ring-3" />

          {/* Floating orbs */}
          <div className="auth-orb auth-orb-teal" />
          <div className="auth-orb auth-orb-orange" />

          {/* Subtle grid lines */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.022)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.022)_1px,transparent_1px)] bg-[size:72px_72px]" />

          {/* Bottom fade */}
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#080f1a] to-transparent" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-1 flex-col justify-between px-10 py-10 xl:px-14 xl:py-12">

          {/* Logo */}
          <div className="auth-fade-in flex items-center gap-3" style={{ animationDelay: "0ms" }}>
            <div className="relative flex size-10 items-center justify-center">
              <div className="absolute inset-0 rounded-[14px] bg-gradient-to-br from-teal-400 via-cyan-400 to-orange-400 shadow-lg shadow-teal-500/30" />
              <KanbanSquare className="relative size-[18px] text-white" />
            </div>
            <span className="font-display text-[1.05rem] font-semibold text-white/90 tracking-tight">
              ProjectFlow
            </span>
          </div>

          {/* Hero text */}
          <div className="space-y-6">
            <div className="auth-fade-in" style={{ animationDelay: "80ms" }}>
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-teal-400/80">
                Gestión de proyectos
              </p>
              <h1 className="font-display text-[clamp(2.8rem,4.2vw,4.2rem)] font-semibold italic leading-[1.08] tracking-tight text-white">
                Coordiná entregas,<br />
                prioridades<br />
                y equipo.
              </h1>
            </div>

            <div className="auth-fade-in" style={{ animationDelay: "160ms" }}>
              <p className="max-w-sm text-base leading-relaxed text-white/45">
                Tableros kanban, calendario operativo y colaboración — en una interfaz pensada para trabajar con más claridad.
              </p>
            </div>

            {/* Feature pills */}
            <div className="auth-fade-in flex flex-wrap gap-2.5" style={{ animationDelay: "240ms" }}>
              {["Tableros", "Calendario", "Filtros globales", "Roles y permisos"].map((f) => (
                <span
                  key={f}
                  className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-white/55 backdrop-blur-sm"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>

          {/* Demo credentials or bottom card */}
          <div className="auth-fade-in" style={{ animationDelay: "320ms" }}>
            {showDemoCredentials ? (
              <div className="rounded-2xl border border-white/8 bg-white/4 p-5 backdrop-blur-sm">
                <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-teal-400/70">
                  Accesos de prueba
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { role: "Producto", email: "sofia@projectflow.dev", pass: "Demo1234!" },
                    { role: "Operaciones", email: "lucia@projectflow.dev", pass: "Demo1234!" },
                  ].map((cred) => (
                    <div key={cred.role} className="rounded-xl border border-white/8 bg-white/4 p-3.5">
                      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/35 mb-2">
                        {cred.role}
                      </p>
                      <p className="text-sm font-semibold text-white/80 leading-snug truncate">{cred.email}</p>
                      <p className="mt-0.5 text-xs text-white/40">{cred.pass}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  {
                    icon: (
                      <svg className="size-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                      </svg>
                    ),
                    title: "Acceso seguro",
                    description: "Solo accedés a tableros propios o compartidos con tu email.",
                  },
                  {
                    icon: (
                      <svg className="size-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                      </svg>
                    ),
                    title: "Siempre sincronizado",
                    description: "Cambios en tiempo real entre todos los miembros del tablero.",
                  },
                  {
                    icon: (
                      <svg className="size-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                      </svg>
                    ),
                    title: "Roles por tablero",
                    description: "Propietario, editor o viewer — cada miembro con su nivel de acceso.",
                  },
                ].map((card) => (
                  <div key={card.title} className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/4 p-4 backdrop-blur-sm">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-teal-500/15">
                      {card.icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white/80">{card.title}</p>
                      <p className="mt-1 text-xs text-white/40 leading-relaxed">{card.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {asideLink && (
              <a
                href={asideLink.href}
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-teal-400 hover:text-teal-300 transition-colors"
              >
                {asideLink.label}
                <ArrowRight className="size-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* Decorative bottom number */}
        <div className="absolute bottom-8 right-8 font-display text-[8rem] font-semibold leading-none text-white/[0.025] select-none">
          PF
        </div>
      </section>

      {/* ── RIGHT: form panel ── */}
      <section className="flex min-h-screen flex-col bg-background px-5 py-8 sm:px-10 lg:px-12 lg:py-10">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-8 lg:mb-12">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 lg:hidden">
            <div className="relative flex size-9 items-center justify-center">
              <div className="absolute inset-0 rounded-[12px] bg-gradient-to-br from-teal-400 via-cyan-400 to-orange-400 shadow-md" />
              <KanbanSquare className="relative size-4 text-white" />
            </div>
            <span className="font-display text-sm font-semibold tracking-tight">ProjectFlow</span>
          </div>
          <div className="hidden lg:block" />
          <ThemeToggle />
        </div>

        {/* Mobile demo creds */}
        {showDemoCredentials && (
          <div className="mb-7 rounded-2xl border border-border/60 bg-secondary/40 p-4 lg:hidden">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Accesos de prueba
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { role: "Producto", email: "sofia@projectflow.dev", pass: "Demo1234!" },
                { role: "Operaciones", email: "lucia@projectflow.dev", pass: "Demo1234!" },
              ].map((cred) => (
                <div key={cred.role} className="rounded-xl border border-border bg-background/70 p-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{cred.role}</p>
                  <p className="mt-1.5 text-xs font-semibold truncate">{cred.email}</p>
                  <p className="text-xs text-muted-foreground">{cred.pass}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form body — aligned to top, matching left panel */}
        <div className="w-full max-w-sm mx-auto lg:max-w-none">

          {/* Heading */}
          <div className="mb-8">
            <h2 className="font-display text-[clamp(1.9rem,3.5vw,2.6rem)] font-semibold leading-none tracking-tight">
              {title}
            </h2>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              {subtitle}
            </p>
          </div>

          {/* Form card */}
          <div className="rounded-2xl border border-border/60 bg-card/80 p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.06)] sm:p-7">
            {children}
          </div>

          {/* Footer */}
          <p className="mt-5 text-center text-xs text-muted-foreground leading-relaxed">
            {footer}
          </p>
        </div>
      </section>

      {/* ── Global auth page CSS ── */}
      <style>{`
        @keyframes auth-ring-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes auth-ring-spin-rev {
          from { transform: rotate(0deg); }
          to   { transform: rotate(-360deg); }
        }
        @keyframes auth-orb-float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%       { transform: translate(18px, -24px) scale(1.06); }
          66%       { transform: translate(-12px, 14px) scale(0.96); }
        }
        @keyframes auth-fade-in {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .auth-ring {
          position: absolute;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.055);
        }
        .auth-ring-1 {
          width: 600px; height: 600px;
          top: -160px; left: -160px;
          animation: auth-ring-spin 38s linear infinite;
        }
        .auth-ring-2 {
          width: 420px; height: 420px;
          bottom: -100px; right: -100px;
          border-color: rgba(13,148,136,0.12);
          animation: auth-ring-spin-rev 28s linear infinite;
        }
        .auth-ring-3 {
          width: 260px; height: 260px;
          top: 50%; left: 50%;
          margin-top: -130px; margin-left: -130px;
          border-color: rgba(234,88,12,0.09);
          animation: auth-ring-spin 52s linear infinite;
        }
        .auth-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(64px);
          opacity: 0.35;
          animation: auth-orb-float 14s ease-in-out infinite;
        }
        .auth-orb-teal {
          width: 280px; height: 280px;
          top: 8%; left: 5%;
          background: radial-gradient(circle, rgba(13,148,136,0.6), transparent 70%);
          animation-delay: 0s;
        }
        .auth-orb-orange {
          width: 220px; height: 220px;
          bottom: 12%; right: 8%;
          background: radial-gradient(circle, rgba(234,88,12,0.5), transparent 70%);
          animation-delay: -7s;
        }
        .auth-fade-in {
          animation: auth-fade-in 550ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
      `}</style>
    </div>
  );
}
