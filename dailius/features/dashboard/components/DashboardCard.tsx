import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function DashboardCard({
  title,
  icon,
  action,
  children,
  className,
  tone = "default",
}: {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  tone?: "default" | "accent";
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border p-6 shadow-sm",
        tone === "accent"
          ? "border-brand-to/20 bg-gradient-to-b from-brand-from/[0.06] to-brand-to/[0.06]"
          : "border-gray-200 bg-white",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-navy">
          {icon}
          {title}
        </h2>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
