import { Skeleton } from "@/components/ui/skeleton";

export function SkeletonTable({ rows = 6 }: { rows?: number }) {
	return (
		<div className="space-y-2">
			<Skeleton className="h-10 w-full" />
			{Array.from({ length: rows }).map((_, i) => (
				<Skeleton key={i} className="h-12 w-full" />
			))}
		</div>
	);
}

