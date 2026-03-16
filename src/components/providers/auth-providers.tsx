"use client";

import { ThemeProvider } from "@/components/providers/theme-provider";

type AuthProvidersProps = {
  children: React.ReactNode;
};

export function AuthProviders({ children }: AuthProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
