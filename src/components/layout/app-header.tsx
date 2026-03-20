"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import {
  CalendarDays,
  KanbanSquare,
  LayoutDashboard,
  Menu,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { logoutAction } from "@/app/actions/auth";
import { NotificationBell } from "@/components/layout/notification-bell";
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
    if (!isMobileNavOpen) return;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMobileNavOpen(false);
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
      if (window.innerWidth >= 1280) setIsMobileNavOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/90 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-controls="mobile-navigation"
              aria-expanded={isMobileNavOpen}
              aria-label="Abrir navegación"
              onClick={() => setIsMobileNavOpen(true)}
              className="focus-ring flex size-9 items-center justify-center rounded-xl border border-border bg-card/80 transition hover:bg-secondary xl:hidden"
            >
              <Menu className="size-4" />
            </button>
            <div className="min-w-0">
              <h1 className="font-display text-[clamp(1.2rem,2.5vw,1.6rem)] font-semibold leading-none">
                {current.title}
              </h1>
              <p className="mt-0.5 truncate text-xs text-muted-foreground sm:text-sm">
                {current.subtitle}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <NotificationBell />
            <ThemeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="focus-ring flex shrink-0 items-center gap-2.5 rounded-xl border border-border bg-card/80 px-2.5 py-1.5 transition hover:bg-secondary/60">
                  <UserAvatar name={user.name} src={user.avatarUrl} className="size-7" />
                  <div className="hidden min-w-0 sm:block">
                    <div className="truncate text-sm font-semibold leading-none">{user.name}</div>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="truncate text-sm">{user.name}</div>
                  <div className="truncate text-xs font-normal text-muted-foreground">{user.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" prefetch={false}>
                    <UserRound className="size-4" />
                    Perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/search" prefetch={false}>
                    <Search className="size-4" />
                    Buscador global
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
                  {isLoggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
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
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          />
          <div
            id="mobile-navigation"
            role="dialog"
            aria-modal="true"
            className="glass-floating absolute inset-y-0 left-0 z-10 flex w-[min(90vw,20rem)] flex-col overflow-y-auto border-r border-border px-4 py-5"
          >
            <div className="flex items-center justify-between gap-4 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="relative flex size-8 items-center justify-center">
                  <div className="absolute inset-0 brand-gradient rounded-[10px] shadow-md" />
                  <KanbanSquare className="relative size-4 text-white" />
                </div>
                <span className="font-display text-base font-semibold">ProjectFlow</span>
              </div>
              <button
                type="button"
                aria-label="Cerrar navegación"
                onClick={() => setIsMobileNavOpen(false)}
                className="focus-ring rounded-xl p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mb-5 flex items-center gap-3 rounded-2xl border border-border bg-secondary/40 px-3 py-2.5">
              <UserAvatar name={user.name} src={user.avatarUrl} className="size-8" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>

            <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Navegación
            </p>
            <nav className="space-y-0.5">
              {mobileNavItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={false}
                    onClick={() => setIsMobileNavOpen(false)}
                    className={cn(
                      "focus-ring group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-secondary/60 hover:text-foreground",
                      isActive && "bg-primary/10 text-primary font-semibold",
                    )}
                  >
                    <div className="flex size-8 items-center justify-center rounded-xl bg-background/70 text-primary ring-1 ring-border/50">
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
