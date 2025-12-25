import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ProductNotFound() {
  return (
    <main className="flex-1 flex items-center justify-center py-16">
      <div className="text-center px-4">
        <span className="mb-4 block text-6xl">🔧</span>
        <h1 className="mb-2 text-2xl font-bold text-foreground">
          Tööriista ei leitud
        </h1>
        <p className="mb-6 text-muted max-w-md mx-auto">
          Seda tööriista ei eksisteeri või on see eemaldatud kataloogist.
        </p>
        <Button asChild>
          <Link href="/tooriistad">Vaata kõiki tööriistu</Link>
        </Button>
      </div>
    </main>
  );
}
