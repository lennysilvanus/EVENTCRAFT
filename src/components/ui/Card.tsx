import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

// ─── 3-D card wrapper ────────────────────────────────────────────────────────
// Wraps any card-shaped element with two dark depth layers that stay in place
// while the main card lifts and tilts on hover — creating a physical stack
// illusion without JavaScript mouse-tracking.
interface Card3DProps {
  children: React.ReactNode;
  className?: string;       // applied to the inner surface (visual classes)
  wrapperClassName?: string; // applied to the outer perspective wrapper (layout classes like col-span)
  rounded?: "xl" | "2xl" | "3xl";
  intensity?: "subtle" | "normal" | "strong";
}

export function Card3D({ children, className, wrapperClassName, rounded = "xl", intensity = "normal" }: Card3DProps) {
  const r = { xl: "rounded-xl", "2xl": "rounded-2xl", "3xl": "rounded-3xl" }[rounded];

  const layers = {
    subtle: {
      d2: "translate-y-1.5 translate-x-1 group-hover/c3d:translate-y-2.5 group-hover/c3d:translate-x-1.5",
      d1: "translate-y-0.5 translate-x-0.5 group-hover/c3d:translate-y-1 group-hover/c3d:translate-x-0.5",
      tilt: "group-hover/c3d:[transform:rotateX(1deg)_rotateY(-1deg)_translateY(-5px)]",
      shadow: "group-hover/c3d:shadow-[0_16px_40px_rgba(0,0,0,0.5),0_4px_12px_rgba(79,70,229,0.1)]",
    },
    normal: {
      d2: "translate-y-2.5 translate-x-1.5 group-hover/c3d:translate-y-4 group-hover/c3d:translate-x-2.5",
      d1: "translate-y-1 translate-x-0.5 group-hover/c3d:translate-y-2 group-hover/c3d:translate-x-1",
      tilt: "group-hover/c3d:[transform:rotateX(2deg)_rotateY(-2deg)_translateY(-8px)_translateX(-1px)]",
      shadow: "group-hover/c3d:shadow-[0_24px_60px_rgba(0,0,0,0.6),0_8px_20px_rgba(79,70,229,0.15)]",
    },
    strong: {
      d2: "translate-y-3 translate-x-2 group-hover/c3d:translate-y-5 group-hover/c3d:translate-x-3",
      d1: "translate-y-1.5 translate-x-1 group-hover/c3d:translate-y-2.5 group-hover/c3d:translate-x-1.5",
      tilt: "group-hover/c3d:[transform:rotateX(3deg)_rotateY(-3deg)_translateY(-12px)_translateX(-2px)]",
      shadow: "group-hover/c3d:shadow-[0_32px_80px_rgba(0,0,0,0.7),0_8px_24px_rgba(79,70,229,0.2)]",
    },
  }[intensity];

  return (
    <div className={cn("group/c3d relative perspective-[1000px]", wrapperClassName)}>
      {/* Depth layer 2 — furthest back */}
      <div className={cn("absolute inset-0 bg-[#04060f] border border-[#0a0e1a] transition-transform duration-300 ease-out", r, layers.d2)} />
      {/* Depth layer 1 */}
      <div className={cn("absolute inset-0 bg-[#080c18] border border-[#0e1528] transition-transform duration-300 ease-out", r, layers.d1)} />
      {/* Main surface */}
      <div className={cn(
        "relative transition-all duration-300 ease-out",
        "shadow-[0_8px_32px_rgba(0,0,0,0.4),0_2px_8px_rgba(0,0,0,0.3)]",
        layers.shadow,
        layers.tilt,
        className
      )}>
        {children}
      </div>
    </div>
  );
}

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  glow?: boolean;
}

export function Card({ className, hover, glow, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-card border border-border rounded-xl",
        hover && "card-hover cursor-pointer",
        glow && "glow-primary",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-6 py-5 border-b border-border", className)} {...props}>
      {children}
    </div>
  );
}

export function CardBody({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-6 py-5", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-6 py-4 border-t border-border bg-surface/40 rounded-b-xl", className)} {...props}>
      {children}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: React.ReactNode;
  iconColor?: string;
  className?: string;
}

export function StatCard({ label, value, change, changeType = "neutral", icon, iconColor = "text-indigo-400", className }: StatCardProps) {
  const changeColors = {
    positive: "text-emerald-400",
    negative: "text-red-400",
    neutral: "text-slate-400",
  };

  return (
    <Card3D intensity="normal">
      <Card className={cn("pattern-dots", className)}>
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">{label}</p>
              <p className="text-3xl font-black text-white tracking-tight">{value}</p>
              {change && (
                <p className={cn("text-xs mt-2 font-medium", changeColors[changeType])}>
                  {change}
                </p>
              )}
            </div>
            <div className={cn("p-3 rounded-xl bg-slate-800/60", iconColor)}>
              {icon}
            </div>
          </div>
        </div>
      </Card>
    </Card3D>
  );
}
