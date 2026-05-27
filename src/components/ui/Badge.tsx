import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "purple";
  size?: "sm" | "md";
  dot?: boolean;
  className?: string;
}

const variants = {
  default: "text-slate-400 bg-slate-400/10 border-slate-400/20",
  success: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  warning: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  danger: "text-red-400 bg-red-400/10 border-red-400/20",
  info: "text-indigo-400 bg-indigo-400/10 border-indigo-400/20",
  purple: "text-purple-400 bg-purple-400/10 border-purple-400/20",
};

const dotColors = {
  default: "bg-slate-400",
  success: "bg-emerald-400",
  warning: "bg-amber-400",
  danger: "bg-red-400",
  info: "bg-indigo-400",
  purple: "bg-purple-400",
};

export default function Badge({ children, variant = "default", size = "sm", dot, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border rounded-full font-medium",
        size === "sm" ? "text-[11px] px-2.5 py-0.5" : "text-xs px-3 py-1",
        variants[variant],
        className
      )}
    >
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotColors[variant])} />}
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeProps["variant"] }> = {
    DRAFT: { label: "Draft", variant: "default" },
    PUBLISHED: { label: "Published", variant: "success" },
    CANCELLED: { label: "Cancelled", variant: "danger" },
    COMPLETED: { label: "Completed", variant: "info" },
    PENDING: { label: "Pending", variant: "warning" },
    CONFIRMED: { label: "Confirmed", variant: "success" },
    DECLINED: { label: "Declined", variant: "danger" },
  };
  const cfg = map[status] || { label: status, variant: "default" as const };
  return <Badge variant={cfg.variant} dot>{cfg.label}</Badge>;
}
