import { Suspense } from "react";

import { CalendarView } from "@/components/calendar/calendar-view";
import { requireUser } from "@/lib/auth/session";
import { getCalendarCards } from "@/lib/data/dashboard";

function CalendarPageFallback() {
  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)]">
        <div className="rounded-[32px] border border-border bg-card/70">
          <div className="border-b border-border px-6 py-6">
            <div className="h-6 w-28 animate-pulse rounded bg-secondary" />
            <div className="mt-4 h-11 w-full max-w-xl animate-pulse rounded bg-secondary/70" />
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-28 animate-pulse rounded-[24px] bg-secondary/70"
                />
              ))}
            </div>
          </div>
          <div className="px-6 py-5">
            <div className="h-[360px] animate-pulse rounded-[28px] bg-secondary/60" />
          </div>
        </div>

        <div className="grid gap-6">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={index}
              className="rounded-[32px] border border-border bg-card/70 p-6"
            >
              <div className="h-6 w-40 animate-pulse rounded bg-secondary" />
              <div className="mt-3 h-4 w-full max-w-sm animate-pulse rounded bg-secondary/70" />
              <div className="mt-6 space-y-4">
                {Array.from({ length: 3 }).map((__, itemIndex) => (
                  <div
                    key={itemIndex}
                    className="h-20 animate-pulse rounded-[24px] bg-secondary/70"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[32px] border border-border bg-card/70 p-6"
          >
            <div className="h-6 w-44 animate-pulse rounded bg-secondary" />
            <div className="mt-3 h-4 w-full max-w-md animate-pulse rounded bg-secondary/70" />
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
      </section>
    </div>
  );
}

async function CalendarPageContent({
  userId,
}: {
  userId: string;
}) {
  const cards = await getCalendarCards(userId);

  return <CalendarView cards={cards} />;
}

export default async function CalendarPage() {
  const user = await requireUser();

  return (
    <Suspense fallback={<CalendarPageFallback />}>
      <CalendarPageContent userId={user.id} />
    </Suspense>
  );
}
