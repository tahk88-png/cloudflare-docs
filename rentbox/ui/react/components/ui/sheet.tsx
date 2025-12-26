import * as React from "react";
import { cn } from "./cn";
import { Button } from "./button";

export interface SheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title?: string;
	description?: string;
	children?: React.ReactNode;
	footer?: React.ReactNode;
	side?: "right" | "left";
}

export function Sheet({ open, onOpenChange, title, description, children, footer, side = "right" }: SheetProps) {
	React.useEffect(() => {
		function onKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") onOpenChange(false);
		}
		if (open) window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [open, onOpenChange]);

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50">
			<div className="absolute inset-0 bg-black/40" onMouseDown={() => onOpenChange(false)} />
			<div
				className={cn(
					"absolute top-0 h-full w-full max-w-md bg-white shadow-xl",
					"border-l border-gray-200",
					side === "right" ? "right-0" : "left-0 border-l-0 border-r",
				)}
				onMouseDown={(e) => e.stopPropagation()}
			>
				<div className="flex h-full flex-col">
					<div className="flex items-start justify-between gap-3 border-b border-gray-200 p-4">
						<div>
							{title ? <h2 className="text-base font-semibold text-gray-900">{title}</h2> : null}
							{description ? <p className="mt-1 text-sm text-gray-600">{description}</p> : null}
						</div>
						<Button variant="ghost" size="icon" aria-label="Close" onClick={() => onOpenChange(false)}>
							<span aria-hidden>×</span>
						</Button>
					</div>
					<div className="flex-1 overflow-auto p-4">{children}</div>
					{footer ? <div className="border-t border-gray-200 p-3">{footer}</div> : null}
				</div>
			</div>
		</div>
	);
}

