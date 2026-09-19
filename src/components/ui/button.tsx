import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger" | "quiet";
  size?: "sm" | "md" | "lg";
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: Props) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] font-medium tracking-wide transition-transform duration-150 ease-out",
        "disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98]",
        size === "sm" && "h-10 px-3 text-sm",
        size === "md" && "h-11 px-4 text-sm",
        size === "lg" && "h-12 px-5 text-base",
        variant === "primary" && "bg-primary text-primary-fg",
        variant === "ghost" && "bg-surface-2 text-fg border border-border",
        variant === "quiet" && "bg-transparent text-muted border border-border",
        variant === "danger" && "bg-bad text-fg",
        className,
      )}
      {...props}
    />
  );
}
