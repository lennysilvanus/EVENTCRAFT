import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  glow?: boolean;
}

export function Card({ className, hover, glow, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-[#141e33] border border-[#1e2d45] rounded-xl",
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
    <div className={cn("px-6 py-5 border-b border-[#1e2d45]", className)} {...props}>
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
    <div className={cn("px-6 py-4 border-t border-[#1e2d45] bg-[#0f1629]/40 rounded-b-xl", className)} {...props}>
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
    <Card className={cn("pattern-dots", className)}>
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">{label}</p>
            <p className="text-3xl font-bold text-white">{value}</p>
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
  );
}
