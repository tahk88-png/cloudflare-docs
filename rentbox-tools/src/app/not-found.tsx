import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex-1 flex items-center justify-center py-16">
      <div className="text-center px-4">
        <span className="mb-4 block text-6xl">404</span>
        <h1 className="mb-2 text-2xl font-bold text-foreground">
          Lehte ei leitud
        </h1>
        <p className="mb-6 text-muted max-w-md mx-auto">
          Otsitavat lehte ei eksisteeri. Võimalik, et see on eemaldatud või
          aadress on valesti sisestatud.
        </p>
        <Button asChild>
          <Link href="/tooriistad">Tagasi tööriistad</Link>
        </Button>
      </div>
    </main>
  );
}
