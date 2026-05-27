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

const variants = {
  primary: "bg-indigo-600 hover:bg-indigo-500 text-white border-transparent shadow-lg shadow-indigo-900/30",
  secondary: "bg-emerald-600 hover:bg-emerald-500 text-white border-transparent shadow-lg shadow-emerald-900/30",
  ghost: "bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white border-transparent",
  danger: "bg-red-600 hover:bg-red-500 text-white border-transparent shadow-lg shadow-red-900/30",
  outline: "bg-transparent hover:bg-slate-800/60 text-slate-300 hover:text-white border-slate-700 hover:border-slate-500",
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
          "inline-flex items-center justify-center font-medium border transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading ? <Loader2 className="animate-spin shrink-0" size={size === "sm" ? 14 : size === "lg" ? 18 : 16} /> : icon}
        {children}
        {!loading && iconRight}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
