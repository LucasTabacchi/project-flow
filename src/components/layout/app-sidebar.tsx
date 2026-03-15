import Link from "next/link";
import {
  CalendarDays,
  KanbanSquare,
  LayoutDashboard,
  Search,
  UserRound,
} from "lucide-react";

import { NavLink } from "@/components/layout/nav-link";
import { RoutePrefetch } from "@/components/layout/route-prefetch";
import { SidebarBoardsSection } from "@/components/layout/sidebar-boards-section";
import { UserAvatar } from "@/components/ui/avatar";

type AppSidebarProps = {
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
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

const prefetchedRoutes = navItems.map((item) => item.href);

function SidebarBoardsSkeleton() {
  return (
    <>
      <div className="mt-8 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Tableros activos</p>
          <p className="text-xs text-muted-foreground">
            Cargando accesos recientes...
          </p>
        </div>
        <div className="h-6 w-10 animate-pulse rounded-full bg-secondary" />
      </div>

      <div className="mt-4 space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="glass-panel flex items-start gap-3 rounded-[24px] border border-border p-4"
          >
            <div className="mt-1 size-3 rounded-full bg-secondary/80" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-3/4 animate-pulse rounded bg-secondary" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-secondary/70" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function AppSidebarSkeleton({
  user,
}: {
  user: {
    name: string;
    email: string;
    avatarUrl: string | null;
  };
}) {
  return (
    <aside className="hidden xl:block xl:w-[280px] xl:shrink-0 2xl:w-[310px]">
      <div className="sticky top-0 flex min-h-screen flex-col border-r border-border/60 px-4 py-5 2xl:px-5 2xl:py-6">
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

        <SidebarBoardsSkeleton />
      </div>
    </aside>
  );
}

function AppSidebarComponent({ user }: AppSidebarProps) {
  return (
    <aside className="hidden xl:block xl:w-[280px] xl:shrink-0 2xl:w-[310px]">
      <div className="sticky top-0 flex min-h-screen flex-col border-r border-border/60 px-4 py-5 2xl:px-5 2xl:py-6">
        <RoutePrefetch routes={prefetchedRoutes} />

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

        <SidebarBoardsSection />
      </div>
    </aside>
  );
}

export const AppSidebar = Object.assign(AppSidebarComponent, {
  Skeleton: AppSidebarSkeleton,
});
