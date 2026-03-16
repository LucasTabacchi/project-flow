import * as React from "react";
import { ChevronDown } from "lucide-react";

import { fieldSelectClassName } from "@/components/ui/field";
import { cn } from "@/lib/utils";

type NativeSelectProps = React.ComponentProps<"select">;

export const nativeSelectClassName =
  fieldSelectClassName;

const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(nativeSelectClassName, className)}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
      </div>
    );
  },
);

NativeSelect.displayName = "NativeSelect";

export { NativeSelect };
