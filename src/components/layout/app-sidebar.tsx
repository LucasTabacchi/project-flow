import Link from "next/link";
import {
  CalendarDays,
  KanbanSquare,
  LayoutDashboard,
  Search,
  UserRound,
} from "lucide-react";

import { NavLink } from "@/components/layout/nav-link";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/avatar";
import { getBoardTheme, getRoleLabel } from "@/lib/utils";

type AppSidebarProps = {
  user: {
    name: string;
    email: string;
    avatarUrl: string | null;
  };
  boards: Array<{
    id: string;
    name: string;
    theme: string;
    role: string;
  }>;
};

const navItems = [
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
];

export function AppSidebar({ user, boards }: AppSidebarProps) {
  return (
    <aside className="hidden w-[310px] shrink-0 xl:block">
      <div className="sticky top-0 flex min-h-screen flex-col border-r border-border/60 px-5 py-6">
        <Link href="/dashboard" className="mb-8 flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-[20px] bg-gradient-to-br from-teal-500 via-cyan-400 to-orange-400 text-white shadow-lg">
            <KanbanSquare className="size-6" />
          </div>
          <div>
            <div className="font-display text-xl font-semibold">ProjectFlow</div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Board control hub
            </p>
          </div>
        </Link>

        <div className="glass-panel mb-6 rounded-[28px] border border-border p-4">
          <div className="flex items-center gap-3">
            <UserAvatar name={user.name} src={user.avatarUrl} className="size-12" />
            <div className="min-w-0">
              <p className="truncate font-semibold">{user.name}</p>
              <p className="truncate text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink key={item.href} href={item.href}>
                <div className="flex size-9 items-center justify-center rounded-2xl bg-background/70 text-primary ring-1 ring-border">
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0">
                  <div>{item.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.description}
                  </div>
                </div>
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-8 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Tableros activos</p>
            <p className="text-xs text-muted-foreground">
              Acceso rápido a tus proyectos
            </p>
          </div>
          <Badge variant="secondary">{boards.length}</Badge>
        </div>

        <div className="mt-4 space-y-3">
          {boards.map((board) => {
            const theme = getBoardTheme(board.theme);

            return (
              <Link
                key={board.id}
                href={`/boards/${board.id}`}
                className="glass-panel flex items-start gap-3 rounded-[24px] border border-border p-4 transition hover:-translate-y-0.5"
              >
                <div
                  className={`mt-1 size-3 rounded-full bg-gradient-to-r ${theme.gradientClass}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{board.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {getRoleLabel(board.role as "OWNER" | "EDITOR" | "VIEWER")}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
