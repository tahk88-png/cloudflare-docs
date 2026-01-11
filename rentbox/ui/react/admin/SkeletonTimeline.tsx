import { Skeleton } from "../components/ui/skeleton";

export function SkeletonTimeline() {
	return (
		<div className="rounded-xl border border-gray-200 bg-white p-4">
			<div className="grid grid-cols-[14rem_1fr] gap-3">
				<Skeleton className="h-10 w-full" />
				<Skeleton className="h-10 w-full" />
			</div>
			<div className="mt-4 space-y-2">
				<Skeleton className="h-10 w-full" />
				<Skeleton className="h-10 w-full" />
				<Skeleton className="h-10 w-full" />
				<Skeleton className="h-10 w-full" />
			</div>
		</div>
	);
}

