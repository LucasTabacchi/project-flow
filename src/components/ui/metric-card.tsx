import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MetricTone = "default" | "success" | "warning";

type MetricCardProps = {
  label: string;
  value: ReactNode;
  description: ReactNode;
  icon?: LucideIcon;
  tone?: MetricTone;
  className?: string;
  valueClassName?: string;
};

type MetricTileProps = {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  tone?: MetricTone;
  hint?: ReactNode;
  className?: string;
  valueClassName?: string;
};

const metricToneClasses: Record<
  MetricTone,
  {
    iconContainer: string;
  }
> = {
  default: {
    iconContainer: "bg-primary/10 text-primary",
  },
  success: {
    iconContainer: "bg-success-surface text-success-foreground",
  },
  warning: {
    iconContainer: "bg-warning-surface text-warning-foreground",
  },
};

export function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  tone = "default",
  className,
  valueClassName,
}: MetricCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="space-y-0 pb-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </p>
          {Icon ? (
            <div
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-xl",
                metricToneClasses[tone].iconContainer,
              )}
            >
              <Icon className="size-3.5" />
            </div>
          ) : null}
        </div>
        <CardTitle
          className={cn(
            "mt-2 font-display text-[clamp(1.75rem,2.8vw,2.4rem)] leading-none",
            valueClassName,
          )}
        >
          {value}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
}

export function MetricTile({
  label,
  value,
  icon: Icon,
  tone = "default",
  hint,
  className,
  valueClassName,
}: MetricTileProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/60 bg-background/60 px-3.5 py-3",
        className,
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 flex items-center gap-2 font-display text-xl font-semibold",
          valueClassName,
        )}
      >
        {Icon ? (
          <span
            className={cn(
              "inline-flex size-7 items-center justify-center rounded-xl",
              metricToneClasses[tone].iconContainer,
            )}
          >
            <Icon className="size-3.5" />
          </span>
        ) : null}
        <span>{value}</span>
      </p>
      {hint ? <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
