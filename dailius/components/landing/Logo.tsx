import { cn } from "@/lib/cn";

/**
 * Wordmark only. Brand guidelines (docs/brand-guidelines.md) call for a
 * rounded "D" + clock icon mark alongside the wordmark, but no source asset
 * for that mark exists in the repo yet — see CLAUDE.md follow-ups.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("text-xl font-bold tracking-tight text-navy", className)}>
      D
      <span className="bg-gradient-to-b from-brand-from to-brand-to bg-clip-text text-transparent">
        ai
      </span>
      lius
    </span>
  );
}
