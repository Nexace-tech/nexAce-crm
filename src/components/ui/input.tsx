import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const inputVariants = cva(
  "w-full bg-background rounded-md px-3 py-2 text-sm font-normal border border-default-200 outline-none focus:outline-none focus:border-primary file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
  {
    variants: {
      color: {
        default: "border-default-200 text-foreground focus:border-primary placeholder:text-muted-foreground",
        primary: "border-primary/50 text-primary focus:border-primary placeholder:text-primary/70",
        destructive: "border-destructive/50 text-destructive focus:border-destructive placeholder:text-destructive/70",
        success: "border-success/50 text-success focus:border-success placeholder:text-success/70",
      },
      size: {
        sm: "h-8 text-xs px-2.5",
        default: "h-9.5 text-sm px-3",
        lg: "h-11 text-base px-4",
      },
    },
    defaultVariants: {
      color: "default",
      size: "default",
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "color" | "size">,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, size, color, onWheel, ...props }, ref) => {
    const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
      // Prevent mouse wheel from inadvertently changing date numbers or number inputs when focused
      if (type === "date" || type === "number" || type === "time" || type === "datetime-local") {
        (e.target as HTMLElement).blur();
      }
      if (onWheel) onWheel(e);
    };

    return (
      <input
        type={type}
        className={cn(inputVariants({ color, size }), className)}
        ref={ref}
        onWheel={handleWheel}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
