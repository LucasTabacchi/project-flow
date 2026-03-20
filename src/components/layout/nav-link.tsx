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
      className={cn(
        "focus-ring group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-150 hover:bg-secondary/60 hover:text-foreground",
        isActive &&
          "bg-primary/10 text-primary hover:bg-primary/12 hover:text-primary font-semibold",
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
