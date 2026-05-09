import type { ReactNode } from "react";

type BadgeVariant = "critical" | "warning" | "ok" | "info";

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
}

const classes: Record<BadgeVariant, string> = {
  critical: "border border-[#2a0000] bg-[#1a0000] text-danger",
  warning: "border border-[#2a1200] bg-[#1a0a00] text-warning",
  ok: "border border-[#0f2a00] bg-[#0a1a00] text-success",
  info: "border border-[#3a3200] bg-accent-dim text-accent"
};

export function Badge({ variant = "info", children }: BadgeProps) {
  return <span className={`inline-flex rounded-[20px] px-2.5 py-1 text-xs font-semibold ${classes[variant]}`}>{children}</span>;
}
