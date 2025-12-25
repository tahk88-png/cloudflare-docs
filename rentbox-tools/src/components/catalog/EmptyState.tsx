import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  showBackLink?: boolean;
}

export function EmptyState({
  title = "Tööriistu ei leitud",
  description = "Selles kategoorias hetkel sobivaid tööriistu ei ole. Vaata teisi kategooriaid.",
  showBackLink = true,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-background">
        <Search className="h-8 w-8 text-muted" />
      </div>
      
      <h3 className="mb-2 text-lg font-semibold text-foreground">{title}</h3>
      
      <p className="mb-6 max-w-md text-sm text-muted">{description}</p>
      
      {showBackLink && (
        <Button asChild variant="outline">
          <Link href="/tooriistad">Vaata kõiki tööriistu</Link>
        </Button>
      )}
    </div>
  );
}
