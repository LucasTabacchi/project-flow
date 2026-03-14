import { Suspense } from "react";

import { CalendarView } from "@/components/calendar/calendar-view";
import { requireUser } from "@/lib/auth/session";
import { getCalendarCards } from "@/lib/data/dashboard";

function CalendarPageFallback() {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      {Array.from({ length: 2 }).map((_, index) => (
        <div
          key={index}
          className="rounded-[32px] border border-border bg-card/70 p-6"
        >
          <div className="h-6 w-48 animate-pulse rounded bg-secondary" />
          <div className="mt-3 h-4 w-full max-w-md animate-pulse rounded bg-secondary/70" />
          <div className="mt-6 space-y-4">
            {Array.from({ length: 4 }).map((__, itemIndex) => (
              <div
                key={itemIndex}
                className="h-16 animate-pulse rounded-[24px] bg-secondary/70"
              />
            ))}
          </div>
        </div>
      ))}
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
