"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import {
  CalendarDays,
  LayoutDashboard,
  Menu,
  Plus,
  Search,
  Settings,
  UserRound,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { logoutAction } from "@/app/actions/auth";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserAvatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type AppHeaderProps = {
  user: {
    name: string;
    email: string;
    avatarUrl: string | null;
  };
};

const mobileNavItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    description: "Resumen general",
    icon: LayoutDashboard,
  },
  {
    href: "/search",
    label: "Buscador",
    description: "Tarjetas y filtros",
    icon: Search,
  },
  {
    href: "/calendar",
    label: "Calendario",
    description: "Fechas de entrega",
    icon: CalendarDays,
  },
  {
    href: "/profile",
    label: "Perfil",
    description: "Cuenta y preferencias",
    icon: UserRound,
  },
] as const;

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": {
    title: "Dashboard",
    subtitle: "Tableros, invitaciones y métricas del día.",
  },
  "/search": {
    title: "Buscador global",
    subtitle: "Filtrá tarjetas por prioridad, responsable, fecha y estado.",
  },
  "/calendar": {
    title: "Calendario",
    subtitle: "Seguimiento de entregas y vencimientos.",
  },
  "/profile": {
    title: "Perfil",
    subtitle: "Datos personales y señales de productividad.",
  },
};

export function AppHeader({ user }: AppHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isLoggingOut, startLogout] = useTransition();
  const current =
    pageTitles[pathname] ??
    (pathname.startsWith("/boards/")
      ? {
          title: "Tablero",
          subtitle: "Organización visual de listas y tarjetas.",
        }
      : {
          title: "ProjectFlow",
          subtitle: "Espacio de trabajo colaborativo.",
        });

  useEffect(() => {
    if (!isMobileNavOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileNavOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileNavOpen]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1280) {
        setIsMobileNavOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/92">
        <div className="flex flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <button
              type="button"
              aria-controls="mobile-navigation"
              aria-expanded={isMobileNavOpen}
              aria-label="Abrir navegación"
              onClick={() => setIsMobileNavOpen(true)}
              className="flex size-10 items-center justify-center rounded-2xl border border-border bg-card/80 transition hover:bg-secondary xl:hidden"
            >
              <Menu className="size-4" />
            </button>
            <div className="min-w-0">
              <h1 className="font-display text-[clamp(1.35rem,3vw,2rem)] font-semibold leading-none sm:leading-tight">
                {current.title}
              </h1>
              <p className="max-w-xl pt-1 text-xs text-muted-foreground sm:text-sm">
                {current.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Link
              href="/dashboard"
              className="hidden items-center gap-2 rounded-2xl border border-border bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground transition hover:bg-secondary/80 md:inline-flex"
            >
              <Plus className="size-4" />
              Nuevo tablero
            </Link>
            <Link
              href="/dashboard"
              aria-label="Ir al dashboard"
              className="inline-flex size-10 items-center justify-center rounded-2xl border border-border bg-secondary text-secondary-foreground transition hover:bg-secondary/80 md:hidden"
            >
              <Plus className="size-4" />
            </Link>
            <ThemeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="glass-panel flex shrink-0 items-center gap-3 rounded-2xl border border-border px-2.5 py-2 text-left sm:px-3">
                  <UserAvatar name={user.name} src={user.avatarUrl} className="size-10" />
                  <div className="hidden min-w-0 sm:block">
                    <div className="truncate text-sm font-semibold">{user.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </div>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Cuenta</DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <UserRound className="size-4" />
                    Perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/search">
                    <Settings className="size-4" />
                    Filtros globales
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={isLoggingOut}
                  onSelect={(event) => {
                    event.preventDefault();
                    startLogout(async () => {
                      await logoutAction();
                      router.replace("/login");
                    });
                  }}
                >
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {isMobileNavOpen ? (
        <div className="fixed inset-0 z-50 xl:hidden">
          <button
            type="button"
            aria-label="Cerrar navegación"
            onClick={() => setIsMobileNavOpen(false)}
            className="absolute inset-0 bg-slate-950/55"
          />
          <div
            id="mobile-navigation"
            role="dialog"
            aria-modal="true"
            className="glass-floating absolute inset-y-0 left-0 z-10 flex w-[min(92vw,22rem)] flex-col overflow-y-auto border-r border-border px-4 py-4 sm:px-5 sm:py-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-display text-xl font-semibold">Navegación</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Acceso rápido a las secciones principales.
                </p>
              </div>
              <button
                type="button"
                aria-label="Cerrar navegación"
                onClick={() => setIsMobileNavOpen(false)}
                className="rounded-full p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-6 flex items-center gap-3 rounded-[28px] border border-border bg-card/70 p-4">
              <UserAvatar name={user.name} src={user.avatarUrl} className="size-12" />
              <div className="min-w-0">
                <p className="truncate font-semibold">{user.name}</p>
                <p className="truncate text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>

            <nav className="mt-6 space-y-2">
              {mobileNavItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileNavOpen(false)}
                    className={cn(
                      "group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-muted-foreground transition hover:bg-secondary/70 hover:text-foreground",
                      isActive && "bg-secondary text-foreground shadow-sm",
                    )}
                  >
                    <div className="flex size-9 items-center justify-center rounded-2xl bg-background/70 text-primary ring-1 ring-border">
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <div>{item.label}</div>
                      <div className="text-xs text-muted-foreground">{item.description}</div>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}
