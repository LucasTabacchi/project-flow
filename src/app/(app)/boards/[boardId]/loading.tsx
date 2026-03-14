function ColumnSkeleton() {
  return (
    <div className="w-[320px] shrink-0 rounded-[28px] border border-border bg-card/70 p-4">
      <div className="h-5 w-32 animate-pulse rounded bg-secondary" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[24px] border border-border bg-background/70 p-4"
          >
            <div className="h-4 w-3/4 animate-pulse rounded bg-secondary" />
            <div className="mt-3 h-4 w-full animate-pulse rounded bg-secondary/80" />
            <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-secondary/70" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BoardLoading() {
  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-[32px] border border-border px-6 py-6">
        <div className="h-6 w-28 animate-pulse rounded bg-secondary" />
        <div className="mt-4 h-12 w-full max-w-2xl animate-pulse rounded bg-secondary" />
        <div className="mt-3 h-4 w-full max-w-3xl animate-pulse rounded bg-secondary/70" />
      </section>

      <div className="rounded-[24px] border border-border bg-card/70 p-4">
        <div className="grid gap-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-11 animate-pulse rounded-2xl bg-secondary"
            />
          ))}
        </div>
      </div>

      <div className="kanban-scrollbar flex gap-4 overflow-x-auto pb-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <ColumnSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}
