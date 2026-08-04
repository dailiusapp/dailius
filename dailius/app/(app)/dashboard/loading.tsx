export default function DashboardLoading() {
  return (
    <div
      role="status"
      aria-label="Loading dashboard"
      className="mx-auto w-full max-w-6xl animate-pulse px-6 py-10 sm:px-8 lg:px-12"
    >
      <div className="h-8 w-64 rounded-lg bg-gray-200" />
      <div className="mt-2 h-4 w-40 rounded bg-gray-200" />

      <div className="mt-8 h-40 rounded-2xl bg-gray-200" />

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <div className="h-32 rounded-2xl bg-gray-200" />
          <div className="h-32 rounded-2xl bg-gray-200" />
          <div className="h-24 rounded-2xl bg-gray-200" />
        </div>
        <div className="flex flex-col gap-6">
          <div className="h-56 rounded-2xl bg-gray-200" />
          <div className="h-40 rounded-2xl bg-gray-200" />
          <div className="h-32 rounded-2xl bg-gray-200" />
        </div>
      </div>
    </div>
  );
}
