import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";

import { AppProviders } from "@/components/providers/app-providers";
import { cn } from "@/lib/utils";

import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "ProjectFlow",
    template: "%s | ProjectFlow",
  },
  description:
    "Gestión visual de proyectos con tableros, listas, tarjetas, calendario, colaboración y permisos por rol.",
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
          manrope.variable,
          spaceGrotesk.variable,
          "min-h-screen bg-background font-sans text-foreground antialiased",
        )}
      >
        <AppProviders>
          <div className="relative min-h-screen overflow-x-hidden">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.22),transparent_22%),radial-gradient(circle_at_top_right,rgba(249,115,22,0.18),transparent_18%),linear-gradient(180deg,var(--background),color-mix(in_srgb,var(--background)_86%,white_14%))]"
            />
            {children}
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
