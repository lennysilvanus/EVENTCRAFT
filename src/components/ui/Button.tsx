"use client";

import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

// ─── 3-D button system ────────────────────────────────────────────────────────
// Each variant gets:
//   • a solid bottom shadow = the "thickness" of the button (simulates depth)
//   • hover: lifts slightly + shadow grows
//   • active: presses down by the full shadow height + shadow collapses to 0
// The active translateY must equal the base shadow height so the button
// appears to reach the "floor" when pressed.

const variants = {
  primary: cn(
    "bg-indigo-600 hover:bg-indigo-500 text-white border-transparent",
    // Normal: 4px thick bottom edge in indigo-900
    "shadow-[0_4px_0_0_#312e81,0_6px_16px_rgba(79,70,229,0.35)]",
    // Hover: lift 1px, edge grows to 5px
    "hover:-translate-y-0.5 hover:shadow-[0_5px_0_0_#312e81,0_8px_20px_rgba(79,70,229,0.45)]",
    // Active: sink 4px (= shadow height), edge collapses
    "active:translate-y-1 active:shadow-[0_0px_0_0_#312e81,0_2px_8px_rgba(79,70,229,0.2)]",
  ),
  secondary: cn(
    "bg-emerald-600 hover:bg-emerald-500 text-white border-transparent",
    "shadow-[0_4px_0_0_#064e3b,0_6px_16px_rgba(5,150,105,0.35)]",
    "hover:-translate-y-0.5 hover:shadow-[0_5px_0_0_#064e3b,0_8px_20px_rgba(5,150,105,0.45)]",
    "active:translate-y-1 active:shadow-[0_0px_0_0_#064e3b,0_2px_8px_rgba(5,150,105,0.2)]",
  ),
  danger: cn(
    "bg-red-600 hover:bg-red-500 text-white border-transparent",
    "shadow-[0_4px_0_0_#7f1d1d,0_6px_16px_rgba(220,38,38,0.35)]",
    "hover:-translate-y-0.5 hover:shadow-[0_5px_0_0_#7f1d1d,0_8px_20px_rgba(220,38,38,0.45)]",
    "active:translate-y-1 active:shadow-[0_0px_0_0_#7f1d1d,0_2px_8px_rgba(220,38,38,0.2)]",
  ),
  outline: cn(
    "bg-transparent hover:bg-slate-800/60 text-slate-300 hover:text-white border-slate-700 hover:border-slate-500",
    "shadow-[0_4px_0_0_#080c18,0_4px_12px_rgba(0,0,0,0.3)]",
    "hover:-translate-y-0.5 hover:shadow-[0_5px_0_0_#080c18,0_6px_16px_rgba(0,0,0,0.4)]",
    "active:translate-y-1 active:shadow-[0_0px_0_0_#080c18,0_1px_4px_rgba(0,0,0,0.2)]",
  ),
  ghost: cn(
    "bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white border-transparent",
    "shadow-none hover:shadow-[0_3px_0_0_#080c18] active:shadow-none active:translate-y-0.5",
  ),
};

const sizes = {
  sm: "px-3 py-1.5 text-xs gap-1.5 rounded-lg",
  md: "px-4 py-2.5 text-sm gap-2 rounded-lg",
  lg: "px-6 py-3 text-base gap-2.5 rounded-xl",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, icon, iconRight, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center font-semibold border",
          "transition-all duration-75 ease-out",
          "cursor-pointer select-none",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "disabled:shadow-none disabled:translate-y-0",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading
          ? <Loader2 className="animate-spin shrink-0" size={size === "sm" ? 14 : size === "lg" ? 18 : 16} />
          : icon}
        {children}
        {!loading && iconRight}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
