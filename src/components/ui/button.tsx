import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/ui/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "on-dark";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-glacier-700 text-white hover:bg-glacier-800 border border-transparent",
  secondary: "bg-surface text-polar-900 border border-line-strong hover:bg-polar-50",
  ghost: "bg-transparent text-glacier-700 border border-transparent hover:bg-glacier-50",
  danger: "bg-danger text-white hover:bg-[#8c1a15] border border-transparent",
  "on-dark": "bg-white text-polar-900 hover:bg-polar-50 border border-transparent",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm gap-1.5",
  md: "h-11 px-4 text-[0.9375rem] gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string): string {
  return cn(
    "inline-flex items-center justify-center rounded-md font-medium transition-colors",
    "disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:opacity-60",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

type ButtonProps = ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize };

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...props} />;
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize };

export function ButtonLink({ variant, size, className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}
