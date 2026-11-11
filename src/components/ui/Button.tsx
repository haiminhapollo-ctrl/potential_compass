import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

// Nut hanh dong: Mau xanh la sau (#1B4D3E), vien net don 1px, khu bong mo GPU.
const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "border border-brand-800 bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 " +
    "disabled:border-clay-line disabled:bg-ink-200 disabled:text-ink-500",
  secondary:
    "border border-clay-line bg-clay-surface text-ink-800 hover:bg-clay-sunken active:border-brand-600",
  ghost:
    "border border-transparent bg-transparent text-ink-600 hover:border-clay-line hover:bg-clay-sunken hover:text-ink-800",
  danger:
    "border border-terracotta-700 bg-terracotta-600 text-white hover:bg-terracotta-700",
};

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-clay-sm px-5 py-3 text-[15px] font-bold " +
  "transition-colors duration-150 focus-ring active:translate-y-px " +
  "disabled:cursor-not-allowed disabled:opacity-60";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

export function Button({ variant = "primary", className = "", children, ...props }: ButtonProps) {
  return (
    <button className={`${BASE} ${VARIANT_CLASSES[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

interface LinkButtonProps {
  href: string;
  variant?: Variant;
  className?: string;
  children: ReactNode;
}

export function LinkButton({ href, variant = "primary", className = "", children }: LinkButtonProps) {
  return (
    <Link href={href} className={`${BASE} ${VARIANT_CLASSES[variant]} ${className}`}>
      {children}
    </Link>
  );
}
