export default function WeeklyPlanLoading() {
  return (
    <div
      role="status"
      aria-label="Loading weekly plan"
      className="mx-auto w-full max-w-6xl animate-pulse px-6 py-10 sm:px-8 lg:px-12"
    >
      <div className="h-8 w-40 rounded-lg bg-gray-200" />

      <div className="mt-6 h-11 w-full rounded-full bg-gray-200" />

      <div className="mt-6 flex flex-col gap-6">
        {Array.from({ length: 7 }, (_, index) => (
          <div key={index} className="h-32 rounded-2xl bg-gray-200" />
        ))}
      </div>
    </div>
  );
}
