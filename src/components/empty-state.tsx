import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description: string;
  className?: string;
  action?: React.ReactNode;
};

export function EmptyState({
  title,
  description,
  className,
  action,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "glass-panel flex flex-col items-center justify-center gap-4 rounded-[28px] border border-dashed border-border px-6 py-12 text-center",
        className,
      )}
    >
      <div className="flex size-14 items-center justify-center rounded-3xl bg-primary/12 text-primary">
        <Sparkles className="size-6" />
      </div>
      <div className="space-y-2">
        <h3 className="font-display text-xl font-semibold">{title}</h3>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}
