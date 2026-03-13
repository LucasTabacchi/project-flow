import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { requireUser } from "@/lib/auth/session";
import { getUserSidebarBoards } from "@/lib/data/boards";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireUser();
  const boards = await getUserSidebarBoards(user.id);

  return (
    <div className="flex min-h-screen">
      <AppSidebar user={user} boards={boards} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <AppHeader user={user} />
        <main className="flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
