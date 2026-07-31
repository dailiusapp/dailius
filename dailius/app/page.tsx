export default function Home() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* Hero */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-5xl text-center">
          <span className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600">
            🚀 Private Beta Coming Soon
          </span>

          <h1 className="mt-8 text-5xl font-bold tracking-tight sm:text-6xl">
            Make time for what matters.
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-xl leading-8 text-gray-600">
            Dailius is an AI life planner that helps busy professionals balance
            work, family, fitness, hobbies, and personal goals without
            constantly rearranging their calendar.
          </p>

          <div className="mx-auto mt-16 max-w-3xl rounded-2xl border border-gray-200 bg-gray-50 p-8 shadow-sm">
            <div className="space-y-4 text-left">
              <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
                Example
              </p>

              <div className="rounded-lg bg-white p-5 shadow">
                <p className="font-medium">You:</p>

                <p className="mt-2 text-gray-700">
                  "I missed my Tuesday workout."
                </p>

                <hr className="my-4" />

                <p className="font-medium">Dailius:</p>

                <p className="mt-2 text-gray-600">
                  "I found a 45-minute window Thursday morning that keeps your
                  weekly training goal on track without affecting your work or
                  family commitments."
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="bg-gray-50 px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-4xl font-bold">
            Life is full. Your calendar isn't enough.
          </h2>

          <p className="mt-6 max-w-3xl text-lg text-gray-600">
            You already know what matters.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              "🏃 Stay healthy",
              "👨‍👩‍👦 Spend time with family",
              "🎸 Practice your hobbies",
              "📚 Keep learning",
              "💼 Grow your career",
              "🚀 Build personal projects",
            ].map((item) => (
              <div
                key={item}
                className="rounded-xl bg-white p-6 shadow-sm"
              >
                <p className="text-lg font-medium">{item}</p>
              </div>
            ))}
          </div>

          <p className="mt-10 max-w-3xl text-lg leading-8 text-gray-600">
            The problem isn't motivation.
            <br />
            It's finding the time.
          </p>

          <p className="mt-4 max-w-3xl text-lg leading-8 text-gray-600">
            Between meetings, childcare, appointments, errands, and unexpected
            changes, the things that matter most are often the first things to
            disappear from your week.
          </p>
        </div>
      </section>

      {/* Solution */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-4xl font-bold">Meet Dailius.</h2>

          <p className="mt-6 max-w-3xl text-lg leading-8 text-gray-600">
            Dailius is an AI planning assistant that understands your goals,
            commitments, preferences, and available time to build a realistic
            weekly plan that actually fits your life.
          </p>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <div className="rounded-2xl border p-8">
              <h3 className="text-xl font-semibold">📅 Commitments</h3>

              <p className="mt-4 text-gray-600">
                Meetings, appointments, family responsibilities, work, and
                everything already on your calendar.
              </p>
            </div>

            <div className="rounded-2xl border p-8">
              <h3 className="text-xl font-semibold">🎯 Goals</h3>

              <p className="mt-4 text-gray-600">
                Running, cycling, strength training, guitar practice, reading,
                learning, or whatever matters to you.
              </p>
            </div>

            <div className="rounded-2xl border p-8">
              <h3 className="text-xl font-semibold">⚙️ Preferences</h3>

              <p className="mt-4 text-gray-600">
                Don't work out after 8 PM. Protect family dinner. Longer rides
                on weekends. Your plan adapts to your life.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-4xl font-bold">How it works</h2>

          <div className="mt-12 grid gap-8 md:grid-cols-2">
            {[
              {
                number: "01",
                title: "Tell Dailius what matters",
                description:
                  "Add your goals, hobbies, routines, and personal priorities.",
              },
              {
                number: "02",
                title: "Connect your schedule",
                description:
                  "Import your calendar or manually add your commitments.",
              },
              {
                number: "03",
                title: "Receive your weekly plan",
                description:
                  "Get an optimized schedule that fits your real life—not an ideal one.",
              },
              {
                number: "04",
                title: "Adapt when life changes",
                description:
                  "Miss a workout or work late? Dailius suggests the best alternative.",
              },
            ].map((step) => (
              <div
                key={step.number}
                className="rounded-2xl bg-white p-8 shadow-sm"
              >
                <div className="text-sm font-semibold text-gray-400">
                  {step.number}
                </div>

                <h3 className="mt-3 text-2xl font-semibold">
                  {step.title}
                </h3>

                <p className="mt-4 text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Early Access */}
      <section
        id="early-access"
        className="px-6 py-24"
      >
        <div className="mx-auto max-w-3xl rounded-3xl bg-black px-8 py-16 text-center text-white">
          <h2 className="text-4xl font-bold">
            Help shape the future of personal planning.
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-300">
            We're looking for early users who want to balance work, family,
            fitness, hobbies, and personal goals with less stress and better
            planning.
          </p>

          <h3 className="mt-10 text-2xl font-semibold">
            Join the Private Beta
          </h3>

          <p className="mt-4 text-lg text-gray-300">
            Just send us an email at{" "}
            <a
              href="mailto:dailiusapp@gmail.com"
              className="font-semibold text-white underline underline-offset-4 hover:text-gray-200"
            >
              dailiusapp@gmail.com
            </a>
            . Tell us a little about yourself and how Dailius could help you.
            We'd love to hear from you.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 px-6 py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 md:flex-row">
          <div>
            <h3 className="text-xl font-bold">Dailius</h3>

            <p className="mt-2 text-gray-500">
              Your AI Life Planner
            </p>
          </div>

          <div className="text-sm text-gray-500">
            © {new Date().getFullYear()} Dailius. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}