export default function HomePage() {
  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Rentbox AI Employee v1.0</h1>
          <p className="text-sm text-white/70">
            Web + backend feature: chat widget, event-driven automation, and admin console.
          </p>
        </header>

        <section className="rounded-xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm">
            <div className="font-medium">Quick links</div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-white/80">
              <li>
                <a className="underline" href="/admin">
                  Admin console
                </a>
              </li>
              <li>
                <a className="underline" href="/widget?booking_id=seed-booking-1">
                  Chat widget (demo)
                </a>
              </li>
              <li>
                <a className="underline" href="/embed/widget?booking_id=seed-booking-1">
                  Widget iframe (demo)
                </a>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}

