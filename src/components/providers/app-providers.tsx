"use client";

import { Toaster } from "sonner";

import { ThemeProvider } from "@/components/providers/theme-provider";

type AppProvidersProps = {
  children: React.ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
      <Toaster
        closeButton
        position="top-right"
        richColors
        toastOptions={{
          className:
            "glass-panel border-border text-foreground shadow-[var(--shadow-soft)]",
        }}
      />
    </ThemeProvider>
  );
}
