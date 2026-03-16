import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
        "inline-flex items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/60",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:-translate-y-0.5 hover:shadow-lg",
        secondary:
          "border border-border bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "text-foreground hover:bg-secondary/60",
        outline:
          "border border-border bg-transparent text-foreground hover:bg-secondary/50",
        destructive:
          "bg-destructive text-destructive-foreground hover:brightness-110",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-9 rounded-xl px-3",
        lg: "h-12 rounded-2xl px-5",
        icon: "size-10 rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };
