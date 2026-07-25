import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all duration-300 hover:ring-2 hover:ring-offset-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
  {
    variants: {
      color: {
        default: "bg-default text-default-foreground hover:bg-default/90 hover:ring-default",
        primary: "bg-primary text-primary-foreground hover:bg-primary/90 hover:ring-primary",
        secondary: "bg-secondary text-secondary-foreground hover:ring-secondary",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:ring-destructive",
        warning: "bg-warning text-warning-foreground hover:bg-warning/90 hover:ring-warning",
        info: "bg-info text-info-foreground hover:bg-info/90 hover:ring-info",
        success: "bg-success text-success-foreground hover:bg-success/90 hover:ring-success",
      },
      variant: {
        default: "",
        outline: "border border-border text-foreground bg-transparent hover:bg-accent hover:text-foreground hover:ring-0",
        soft: "text-foreground bg-accent/50 hover:bg-accent hover:text-foreground",
        ghost: "text-muted-foreground bg-transparent hover:bg-accent hover:text-foreground hover:ring-0 hover:ring-offset-0",
        shadow: "shadow-md"
      },
      size: {
        default: "h-11 md:px-6 px-4",
        sm: "h-8 text-xs md:px-3 px-2.5",
        md: "h-9.5 md:px-4 px-3",
        lg: "h-12 text-base md:px-8 px-6",
        icon: "h-9 w-9 p-0 flex items-center justify-center shrink-0",
      }
    },
    defaultVariants: {
      variant: "default",
      color: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "color">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, color, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, color, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
