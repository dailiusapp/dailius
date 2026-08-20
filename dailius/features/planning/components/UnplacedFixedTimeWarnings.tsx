// Surfaces fixed-time activities whose exact slot couldn't be placed on
// the latest regeneration (see generatePlan.ts / engine.ts's
// unplacedFixedTimeActivities). Reuses the same role="alert" amber/red box
// styling already used for form errors throughout the app (e.g.
// ActivityEditForm.tsx's formError block) rather than a new design pattern.
export function UnplacedFixedTimeWarnings({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null;

  return (
    <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
      <p className="font-medium">Some fixed-time activities couldn&apos;t be scheduled this week</p>
      <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
        {warnings.map((warning) => (
          <li key={warning}>{warning}</li>
        ))}
      </ul>
    </div>
  );
}
