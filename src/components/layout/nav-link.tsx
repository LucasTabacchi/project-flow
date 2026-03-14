"use client";

import Link, { type LinkProps } from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

type NavLinkProps = LinkProps & {
  children: React.ReactNode;
  className?: string;
};

export function NavLink({ href, className, children, ...props }: NavLinkProps) {
  const pathname = usePathname();
  const isActive =
    pathname === href || (href !== "/dashboard" && pathname.startsWith(String(href)));

  return (
    <Link
      href={href}
      prefetch
      className={cn(
        "group flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-secondary/70 hover:text-foreground",
        isActive && "bg-secondary text-foreground shadow-sm",
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
