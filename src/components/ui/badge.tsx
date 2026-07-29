import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border py-0.5 px-2.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      color: {
        default: "border-transparent bg-muted text-foreground",
        primary: "border-transparent bg-primary text-primary-foreground",
        secondary: "bg-secondary border-transparent text-secondary-foreground",
        destructive: "bg-destructive border-transparent text-destructive-foreground",
        success: "bg-success border-transparent text-success-foreground",
        info: "bg-info border-transparent text-info-foreground",
        warning: "bg-warning border-transparent text-warning-foreground",
      },
      variant: {
        default: "",
        outline: "bg-transparent border-border text-foreground",
        soft: "bg-opacity-15 border-transparent",
      },
      rounded: {
        sm: "rounded",
        md: "rounded-md",
        lg: "rounded-lg",
        full: "rounded-full",
      }
    },
    defaultVariants: {
      color: "default",
      variant: "default",
      rounded: "md",
    },
  }
);

export interface BadgeProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "color">,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, color, variant, rounded, ...props }: BadgeProps) {
  return (
    <div
      className={cn(badgeVariants({ color, variant, rounded }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
