"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const avatarVariants = cva(
  "inline-flex items-center justify-center font-medium text-foreground select-none shrink-0 overflow-hidden rounded-full bg-muted",
  {
    variants: {
      size: {
        sm: "h-8 w-8 text-xs",
        default: "h-10 w-10 text-sm",
        md: "h-12 w-12 text-base",
        lg: "h-16 w-16 text-xl",
        xl: "h-20 w-20 text-2xl",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

export interface AvatarProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>,
    VariantProps<typeof avatarVariants> {}

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>(({ className, size, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(avatarVariants({ size }), className)}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

/**
 * AvatarImage — wraps Radix's Image primitive with a robust onError fallback.
 *
 * Problem: corrupt or tiny files (e.g. a 1KB broken PNG) are served with HTTP 200,
 * so Radix never triggers the automatic fallback — the browser just shows a
 * broken-image icon. We fix this by:
 *   1. Hiding the <img> element on any load error via onError.
 *   2. Skipping render entirely if src is empty/undefined.
 *   3. Calling the optional `onBroken` callback so parents can swap in a placeholder.
 */
const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image> & {
    /** Called when the image fails to load (corrupt, 404, etc.) */
    onBroken?: () => void;
  }
>(({ className, src, onError, onBroken, ...props }, ref) => {
  // Don't render the image at all if src is empty — let fallback show immediately
  if (!src) return null;

  return (
    <AvatarPrimitive.Image
      ref={ref}
      src={src}
      className={cn("aspect-square h-full w-full object-cover", className)}
      onError={(e) => {
        // Hide the broken image so Radix renders AvatarFallback
        (e.currentTarget as HTMLImageElement).style.display = "none";
        onBroken?.();
        onError?.(e);
      }}
      {...props}
    />
  );
});
AvatarImage.displayName = AvatarPrimitive.Image.displayName;


const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-primary/10 text-primary font-semibold",
      className
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export { Avatar, AvatarImage, AvatarFallback };
