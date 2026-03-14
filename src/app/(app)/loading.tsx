function LoadingBlock({
  className,
}: {
  className: string;
}) {
  return <div className={`animate-pulse rounded-3xl bg-secondary ${className}`} />;
}

export default function AppLoading() {
  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-[32px] border border-border px-6 py-6">
        <div className="space-y-4">
          <LoadingBlock className="h-6 w-32" />
          <LoadingBlock className="h-11 w-full max-w-3xl" />
          <LoadingBlock className="h-5 w-full max-w-2xl" />
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[28px] border border-border bg-card/70 p-6"
          >
            <LoadingBlock className="h-4 w-28" />
            <LoadingBlock className="mt-4 h-10 w-20" />
            <LoadingBlock className="mt-6 h-4 w-full" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[32px] border border-border bg-card/70 p-6"
          >
            <LoadingBlock className="h-6 w-40" />
            <LoadingBlock className="mt-3 h-4 w-full max-w-md" />
            <div className="mt-6 space-y-4">
              {Array.from({ length: 3 }).map((__, itemIndex) => (
                <div
                  key={itemIndex}
                  className="rounded-[24px] border border-border bg-background/60 p-4"
                >
                  <LoadingBlock className="h-5 w-2/3" />
                  <LoadingBlock className="mt-3 h-4 w-1/2" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
