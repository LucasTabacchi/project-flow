import { Suspense } from "react";

import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppProviders } from "@/components/providers/app-providers";
import { requireUser } from "@/lib/auth/session";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireUser();

  return (
    <AppProviders>
      <div className="flex min-h-screen flex-col xl:flex-row">
        <Suspense fallback={<AppSidebar.Skeleton user={user} />}>
          <AppSidebar user={user} />
        </Suspense>
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <AppHeader user={user} />
          <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </AppProviders>
  );
}
