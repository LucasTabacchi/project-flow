import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";

import { cn } from "@/lib/utils";

import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plusjakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: {
    default: "ProjectFlow",
    template: "%s | ProjectFlow",
  },
  description:
    "Gestión visual de proyectos con tableros, listas, tarjetas, calendario, colaboración y permisos por rol.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/favicon.ico",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={cn(
          plusJakarta.variable,
          fraunces.variable,
          "min-h-screen bg-background font-sans text-foreground antialiased",
        )}
      >
        <div className="relative min-h-screen overflow-x-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,rgba(13,148,136,0.16),transparent_30%),radial-gradient(ellipse_at_bottom_right,rgba(234,88,12,0.12),transparent_28%),radial-gradient(ellipse_at_top_right,rgba(6,182,212,0.08),transparent_24%)]"
          />
          {children}
        </div>
      </body>
    </html>
  );
}
