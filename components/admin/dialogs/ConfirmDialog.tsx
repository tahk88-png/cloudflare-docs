"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

export function ConfirmDialog({
	open,
	onOpenChange,
	title,
	description,
	confirmLabel = "Confirm",
	confirmVariant = "destructive",
	onConfirm,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description?: string;
	confirmLabel?: string;
	confirmVariant?: React.ComponentProps<typeof Button>["variant"];
	onConfirm: () => Promise<void> | void;
}) {
	const [busy, setBusy] = React.useState(false);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					{description ? <DialogDescription>{description}</DialogDescription> : null}
				</DialogHeader>
				<DialogFooter>
					<Button
						variant="outline"
						disabled={busy}
						onClick={() => onOpenChange(false)}
					>
						Cancel
					</Button>
					<Button
						variant={confirmVariant}
						disabled={busy}
						onClick={async () => {
							setBusy(true);
							try {
								await onConfirm();
								onOpenChange(false);
							} finally {
								setBusy(false);
							}
						}}
					>
						{busy ? "Working…" : confirmLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

