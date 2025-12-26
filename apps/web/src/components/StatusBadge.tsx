import { Badge } from "@/components/ui/badge";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDING: { label: "Ootel", variant: "outline" },
  PAID: { label: "Makstud", variant: "default" },
  ACTIVE: { label: "Töös", variant: "default" },
  OVERDUE: { label: "Hilinenud", variant: "destructive" },
  COMPLETED: { label: "Lõpetatud", variant: "secondary" },
  CANCELLED: { label: "Tühistatud", variant: "outline" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusMap[status] || { label: status, variant: "outline" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
