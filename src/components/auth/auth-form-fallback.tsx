export function AuthFormFallback() {
  return (
    <div className="space-y-5" aria-hidden="true">
      <div className="rounded-[24px] border border-border bg-secondary/35 p-4">
        <div className="h-4 w-40 animate-pulse rounded bg-foreground/10" />
        <div className="mt-3 h-3 w-full animate-pulse rounded bg-foreground/8" />
        <div className="mt-2 h-3 w-5/6 animate-pulse rounded bg-foreground/8" />
      </div>

      <div className="space-y-2">
        <div className="h-4 w-16 animate-pulse rounded bg-foreground/10" />
        <div className="h-11 w-full animate-pulse rounded-2xl bg-foreground/8" />
      </div>

      <div className="space-y-2">
        <div className="h-4 w-24 animate-pulse rounded bg-foreground/10" />
        <div className="h-11 w-full animate-pulse rounded-2xl bg-foreground/8" />
      </div>

      <div className="h-11 w-full animate-pulse rounded-2xl bg-primary/15" />
    </div>
  );
}
