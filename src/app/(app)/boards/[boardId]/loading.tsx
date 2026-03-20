// ─── MEJORA: Skeleton detallado del tablero ───────────────────────────────
// El skeleton anterior existía pero era poco fiel al layout real. Este refleja
// el header, filtros y columnas kanban con más precisión — la percepción de
// velocidad mejora cuando el skeleton coincide con el layout final.

function CardSkeleton({ titleWidth }: { titleWidth: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 p-4">
      <div className="mb-3 flex gap-2">
        <div className="h-5 w-14 animate-pulse rounded-full bg-secondary" />
        <div className="h-5 w-10 animate-pulse rounded-full bg-secondary/70" />
      </div>
      <div className={`h-4 animate-pulse rounded bg-secondary ${titleWidth}`} />
      <div className="mt-2 h-3.5 w-full animate-pulse rounded bg-secondary/60" />
      <div className="mt-1 h-3.5 w-4/5 animate-pulse rounded bg-secondary/50" />
      <div className="mt-4 flex items-center gap-3">
        <div className="h-3 w-20 animate-pulse rounded bg-secondary/60" />
        <div className="h-3 w-10 animate-pulse rounded bg-secondary/50" />
      </div>
    </div>
  );
}

function ColumnSkeleton({
  cardCount = 3,
  cardWidths = ["w-3/4", "w-full", "w-2/3"],
}: {
  cardCount?: number;
  cardWidths?: string[];
}) {
  return (
    <div className="w-[300px] shrink-0 rounded-3xl border border-border/70 bg-card/60 p-4">
      {/* Column header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-4 w-28 animate-pulse rounded bg-secondary" />
          <div className="h-5 w-7 animate-pulse rounded-full bg-secondary/70" />
        </div>
        <div className="size-7 animate-pulse rounded-lg bg-secondary/60" />
      </div>
      {/* Cards */}
      <div className="space-y-3">
        {Array.from({ length: cardCount }).map((_, i) => (
          <CardSkeleton key={i} titleWidth={cardWidths[i % cardWidths.length]} />
        ))}
      </div>
      {/* Add card button */}
      <div className="mt-3 h-9 w-full animate-pulse rounded-xl bg-secondary/40" />
    </div>
  );
}

export default function BoardLoading() {
  return (
    <div className="space-y-5">
      {/* Board header skeleton */}
      <section className="glass-panel rounded-3xl border border-border px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2.5">
            <div className="h-5 w-20 animate-pulse rounded-full bg-secondary/70" />
            <div className="h-8 w-72 animate-pulse rounded-xl bg-secondary" />
            <div className="h-4 w-96 animate-pulse rounded bg-secondary/60" />
          </div>
          <div className="flex items-center gap-2">
            <div className="size-9 animate-pulse rounded-xl bg-secondary" />
            <div className="size-9 animate-pulse rounded-xl bg-secondary" />
            <div className="h-9 w-28 animate-pulse rounded-xl bg-secondary/80" />
          </div>
        </div>
        {/* Stats row */}
        <div className="mt-5 flex gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-4 w-20 animate-pulse rounded bg-secondary/50" />
          ))}
        </div>
      </section>

      {/* Filters skeleton */}
      <div className="rounded-2xl border border-border bg-card/70 px-4 py-3.5">
        <div className="grid gap-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-xl bg-secondary" />
          ))}
        </div>
      </div>

      {/* Kanban columns */}
      <div className="kanban-scrollbar flex gap-4 overflow-x-auto pb-6">
        <ColumnSkeleton cardCount={4} cardWidths={["w-3/4", "w-full", "w-2/3", "w-5/6"]} />
        <ColumnSkeleton cardCount={2} cardWidths={["w-full", "w-4/5"]} />
        <ColumnSkeleton cardCount={3} cardWidths={["w-2/3", "w-full", "w-3/4"]} />
        <ColumnSkeleton cardCount={1} cardWidths={["w-4/5"]} />
      </div>
    </div>
  );
}
