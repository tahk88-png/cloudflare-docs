import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Rentbox v2</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Production-grade, 24/7 self-service tool rental platform
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/tools"
            className="p-6 border rounded-lg hover:bg-accent transition-colors"
          >
            <h2 className="text-xl font-semibold mb-2">Browse Tools</h2>
            <p className="text-muted-foreground">
              Find and rent tools available in your area
            </p>
          </Link>

          <Link
            href="/dashboard"
            className="p-6 border rounded-lg hover:bg-accent transition-colors"
          >
            <h2 className="text-xl font-semibold mb-2">Minu Rendid</h2>
            <p className="text-muted-foreground">
              View your active and past rentals
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}
