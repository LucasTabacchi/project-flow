"use client";

import Link from "next/link";
import { Menu, Plus, Settings, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";

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

type AppHeaderProps = {
  user: {
    name: string;
    email: string;
    avatarUrl: string | null;
  };
};

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
  const pathname = usePathname();
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

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl border border-border bg-card/80 xl:hidden">
            <Menu className="size-4" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold">{current.title}</h1>
            <p className="text-sm text-muted-foreground">{current.subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="hidden items-center gap-2 rounded-2xl border border-border bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground transition hover:bg-secondary/80 sm:inline-flex"
          >
            <Plus className="size-4" />
            Nuevo tablero
          </Link>
          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="glass-panel flex items-center gap-3 rounded-2xl border border-border px-3 py-2 text-left">
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
              <form action={logoutAction}>
                <DropdownMenuItem asChild>
                  <button type="submit" className="w-full">
                    Cerrar sesión
                  </button>
                </DropdownMenuItem>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
