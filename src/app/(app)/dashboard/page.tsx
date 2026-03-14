import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, CalendarClock } from "lucide-react";

import { CreateBoardDialog } from "@/components/dashboard/create-board-dialog";
import { BoardGrid } from "@/components/dashboard/board-grid";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { InvitationPanel } from "@/components/dashboard/invitation-panel";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { getDashboardData } from "@/lib/data/dashboard";
import { formatDueDate, getBoardTheme, getPriorityLabel } from "@/lib/utils";

function DashboardSectionsFallback() {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[28px] border border-border bg-card/70 p-6"
          >
            <div className="h-4 w-28 animate-pulse rounded bg-secondary" />
            <div className="mt-4 h-10 w-20 animate-pulse rounded bg-secondary" />
            <div className="mt-6 h-4 w-full animate-pulse rounded bg-secondary/70" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 2xl:grid-cols-[1.5fr_0.9fr]">
        {Array.from({ length: 2 }).map((_, columnIndex) => (
          <div
            key={columnIndex}
            className="rounded-[32px] border border-border bg-card/70 p-6"
          >
            <div className="h-6 w-40 animate-pulse rounded bg-secondary" />
            <div className="mt-3 h-4 w-full max-w-md animate-pulse rounded bg-secondary/70" />
            <div className="mt-6 space-y-4">
              {Array.from({ length: 3 }).map((__, itemIndex) => (
                <div
                  key={itemIndex}
                  className="rounded-[24px] border border-border bg-background/60 p-4"
                >
                  <div className="h-5 w-2/3 animate-pulse rounded bg-secondary" />
                  <div className="mt-3 h-4 w-1/2 animate-pulse rounded bg-secondary/70" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

async function DashboardSections({
  dataPromise,
}: {
  dataPromise: ReturnType<typeof getDashboardData>;
}) {
  const data = await dataPromise;

  return (
    <>
      <DashboardStats stats={data.stats} />
      <InvitationPanel invitations={data.pendingInvitations} />

      <section className="grid gap-6 2xl:grid-cols-[1.5fr_0.9fr]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-2xl font-semibold">Tus tableros</h3>
              <p className="text-sm text-muted-foreground">
                Solo ves los propios o compartidos contigo.
              </p>
            </div>
          </div>

          {data.boards.length ? (
            <BoardGrid boards={data.boards} />
          ) : (
            <EmptyState
              title="Todavía no tenés tableros"
              description="Creá el primero para empezar a organizar listas, tarjetas y miembros."
              action={<CreateBoardDialog />}
            />
          )}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Próximas entregas</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Tarjetas con fecha límite en los próximos días.
                </p>
              </div>
              <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                <CalendarClock className="size-5" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.upcomingCards.length ? (
              data.upcomingCards.map((card) => {
                const theme = getBoardTheme(card.boardTheme);

                return (
                  <Link
                    key={card.id}
                    href={`/boards/${card.boardId}`}
                    prefetch
                    className="block rounded-[24px] border border-border bg-background/70 p-4 transition hover:-translate-y-0.5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{card.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {card.boardName} · {card.listName}
                        </p>
                      </div>
                      <Badge className={theme.chipClass}>
                        {getPriorityLabel(card.priority)}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Vence {formatDueDate(card.dueDate)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-primary">
                        Abrir
                        <ArrowRight className="size-4" />
                      </span>
                    </div>
                  </Link>
                );
              })
            ) : (
              <EmptyState
                className="px-4 py-10"
                title="No hay entregas próximas"
                description="Cuando una tarjeta tenga fecha límite aparecerá acá."
              />
            )}
          </CardContent>
        </Card>
      </section>
    </>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const dataPromise = getDashboardData(user.id, user.email);

  return (
    <div className="space-y-6">
      <section className="glass-panel flex flex-col gap-5 rounded-[32px] border border-border px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <Badge>Hola, {user.name.split(" ")[0]}</Badge>
          <div>
            <h2 className="font-display text-4xl font-semibold">
              Todo tu flujo de trabajo en un solo panel.
            </h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Revisá progreso, invitaciones, próximas fechas y entrá directo al
              tablero que necesites.
            </p>
          </div>
        </div>
        <CreateBoardDialog />
      </section>

      <Suspense fallback={<DashboardSectionsFallback />}>
        <DashboardSections dataPromise={dataPromise} />
      </Suspense>
    </div>
  );
}
