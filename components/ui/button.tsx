import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// ponytail: shadcn-style button without @radix Slot (no asChild) — nothing here needs it.
const button = cva(
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius)] text-sm font-medium transition-[background-color,filter,opacity] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/60 whitespace-nowrap",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-ink hover:brightness-95",
        outline: "border border-line bg-transparent text-fg hover:bg-panel-2",
        ghost: "bg-transparent text-fg hover:bg-panel-2",
        danger: "border border-line bg-transparent text-red-400 hover:bg-red-500/10",
      },
      size: { sm: "h-8 px-3", md: "h-10 px-4", icon: "h-9 w-9" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(button({ variant, size }), className)} {...props} />;
}
