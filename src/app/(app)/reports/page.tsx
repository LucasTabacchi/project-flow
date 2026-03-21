import { Suspense } from "react";

import { TimeReportsView } from "@/components/reports/time-reports-view";
import { requireUser } from "@/lib/auth/session";
import { getTimeReportsData } from "@/lib/data/reports";

type ReportsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function TimeReportsFallback() {
  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-[36px] border border-border px-5 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
          <div className="space-y-4">
            <div className="h-6 w-40 animate-pulse rounded-full bg-secondary/80" />
            <div className="h-20 max-w-3xl animate-pulse rounded-[28px] bg-secondary/70" />
            <div className="h-5 max-w-2xl animate-pulse rounded-full bg-secondary/60" />
          </div>
          <div className="rounded-[28px] border border-border/70 px-4 py-4">
            <div className="h-4 w-20 animate-pulse rounded bg-secondary/80" />
            <div className="mt-3 h-11 w-full animate-pulse rounded-xl bg-secondary/70" />
            <div className="mt-3 flex gap-2">
              <div className="h-11 w-24 animate-pulse rounded-xl bg-secondary" />
              <div className="h-11 w-24 animate-pulse rounded-xl bg-secondary/70" />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.25fr)_repeat(4,minmax(0,1fr))]">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[28px] border border-border bg-card/70 p-6"
          >
            <div className="h-4 w-28 animate-pulse rounded bg-secondary" />
            <div className="mt-4 h-10 w-24 animate-pulse rounded bg-secondary" />
            <div className="mt-6 h-4 w-full animate-pulse rounded bg-secondary/70" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        {Array.from({ length: 2 }).map((_, columnIndex) => (
          <div
            key={columnIndex}
            className="rounded-[32px] border border-border bg-card/70 p-6"
          >
            <div className="h-6 w-40 animate-pulse rounded bg-secondary" />
            <div className="mt-3 h-4 w-full max-w-sm animate-pulse rounded bg-secondary/70" />
            <div className="mt-6 space-y-4">
              {Array.from({ length: 4 }).map((__, itemIndex) => (
                <div
                  key={itemIndex}
                  className="h-28 animate-pulse rounded-[24px] bg-secondary/70"
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <section className="rounded-[32px] border border-border bg-card/70 p-6">
        <div className="h-6 w-52 animate-pulse rounded bg-secondary" />
        <div className="mt-3 h-4 w-full max-w-md animate-pulse rounded bg-secondary/70" />
        <div className="mt-6 space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-36 animate-pulse rounded-[24px] bg-secondary/70"
            />
          ))}
        </div>
      </section>
    </div>
  );
}

async function TimeReportsContent({
  userId,
  boardId,
}: {
  userId: string;
  boardId?: string;
}) {
  const data = await getTimeReportsData(userId, boardId);

  return <TimeReportsView data={data} />;
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const boardId = getSingleValue(params.boardId) || undefined;

  return (
    <Suspense fallback={<TimeReportsFallback />}>
      <TimeReportsContent userId={user.id} boardId={boardId} />
    </Suspense>
  );
}
