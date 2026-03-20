import Link from "next/link";
import {
  CalendarDays,
  KanbanSquare,
  LayoutDashboard,
  Search,
  UserRound,
} from "lucide-react";

import { NavLink } from "@/components/layout/nav-link";
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

function SidebarBoardsSkeleton() {
  return (
    <>
      <div className="mt-7 flex items-center justify-between px-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Tableros
        </p>
        <div className="h-4 w-7 animate-pulse rounded-full bg-secondary" />
      </div>
      <div className="mt-2 space-y-1">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-3 rounded-2xl px-3 py-2.5"
          >
            <div className="size-2 rounded-full bg-muted-foreground/30 animate-pulse" />
            <div className="min-w-0 flex-1">
              <div className="h-3.5 w-3/4 animate-pulse rounded bg-secondary" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function SidebarLogo() {
  return (
    <Link
      href="/dashboard"
      prefetch={false}
      className="mb-7 flex items-center gap-3 group"
    >
      <div className="relative flex size-10 items-center justify-center">
        <div className="absolute inset-0 brand-gradient rounded-[14px] opacity-90 group-hover:opacity-100 transition-opacity shadow-md" />
        <KanbanSquare className="relative size-[18px] text-white" />
      </div>
      <div>
        <div className="font-display text-[1.1rem] font-semibold leading-none tracking-tight">
          ProjectFlow
        </div>
        <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Workspace
        </p>
      </div>
    </Link>
  );
}

function UserCard({
  user,
}: {
  user: { name: string; email: string; avatarUrl: string | null };
}) {
  return (
    <div className="mb-5 flex items-center gap-3 rounded-2xl border border-border/60 bg-secondary/40 px-3 py-2.5">
      <UserAvatar name={user.name} src={user.avatarUrl} className="size-8 shrink-0" />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold leading-snug">{user.name}</p>
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
      </div>
    </div>
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
    <aside className="hidden xl:block xl:w-[260px] xl:shrink-0 2xl:w-[280px]">
      <div className="sticky top-0 flex min-h-screen flex-col bg-sidebar-bg border-r border-sidebar-border px-4 py-5 2xl:px-5 2xl:py-6">
        <SidebarLogo />
        <UserCard user={user} />
        <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Navegación
        </p>
        <nav className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.href}
                className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-muted-foreground"
              >
                <div className="flex size-8 items-center justify-center rounded-xl bg-background/60">
                  <Icon className="size-4" />
                </div>
                <span>{item.label}</span>
              </div>
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
    <aside className="hidden xl:block xl:w-[260px] xl:shrink-0 2xl:w-[280px]">
      <div className="sticky top-0 flex min-h-screen flex-col bg-sidebar-bg border-r border-sidebar-border px-4 py-5 2xl:px-5 2xl:py-6">
        <SidebarLogo />
        <UserCard user={user} />

        <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Navegación
        </p>
        <nav className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.href} href={item.href}>
                <div className="flex size-8 items-center justify-center rounded-xl bg-background/70 text-primary ring-1 ring-border/50">
                  <Icon className="size-4" />
                </div>
                <span className="text-sm">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <SidebarBoardsSection userId={user.id} />
      </div>
    </aside>
  );
}

export const AppSidebar = Object.assign(AppSidebarComponent, {
  Skeleton: AppSidebarSkeleton,
});
