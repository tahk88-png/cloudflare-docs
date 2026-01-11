import * as React from "react";
import { cn } from "./cn";
import { Button } from "./button";

export interface DialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title?: string;
	description?: string;
	children: React.ReactNode;
	footer?: React.ReactNode;
}

export function Dialog({ open, onOpenChange, title, description, children, footer }: DialogProps) {
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
			<div className="absolute inset-0 grid place-items-center p-4">
				<div
					role="dialog"
					aria-modal="true"
					className={cn("w-full max-w-lg rounded-xl bg-white shadow-xl", "border border-gray-200")}
					onMouseDown={(e) => e.stopPropagation()}
				>
					<div className="p-4">
						<div className="flex items-start justify-between gap-3">
							<div>
								{title ? <h2 className="text-base font-semibold text-gray-900">{title}</h2> : null}
								{description ? <p className="mt-1 text-sm text-gray-600">{description}</p> : null}
							</div>
							<Button variant="ghost" size="icon" aria-label="Close" onClick={() => onOpenChange(false)}>
								<span aria-hidden>×</span>
							</Button>
						</div>
						<div className="mt-4">{children}</div>
					</div>
					{footer ? <div className="flex items-center justify-end gap-2 border-t border-gray-200 p-3">{footer}</div> : null}
				</div>
			</div>
		</div>
	);
}

