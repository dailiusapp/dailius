"use client";

function getGreeting(hour: number, firstName?: string): string {
  const period = hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";
  return firstName ? `Good ${period}, ${firstName}` : `Good ${period}`;
}

export function WelcomeHeader({ firstName }: { firstName?: string }) {
  // Only the browser knows the visitor's local time, so the server-rendered
  // greeting is intentionally generic — suppressHydrationWarning lets the
  // client-computed, time-of-day greeting replace it without a mismatch warning.
  const greeting =
    typeof window === "undefined"
      ? firstName
        ? `Welcome back, ${firstName}`
        : "Welcome back"
      : getGreeting(new Date().getHours(), firstName);

  return (
    <div>
      <h1
        suppressHydrationWarning
        className="text-2xl font-semibold tracking-tight text-navy sm:text-3xl"
      >
        {greeting}
      </h1>
      <p className="mt-1 text-[15px] text-gray-600">Here&apos;s your plan for today.</p>
    </div>
  );
}
