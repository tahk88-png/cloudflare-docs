import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function EmptyState({
	title,
	description,
	actionHref,
	actionLabel,
}: {
	title: string;
	description: string;
	actionHref?: string;
	actionLabel?: string;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			{actionHref && actionLabel ? (
				<CardContent>
					<Button asChild>
						<Link href={actionHref}>{actionLabel}</Link>
					</Button>
				</CardContent>
			) : null}
		</Card>
	);
}

