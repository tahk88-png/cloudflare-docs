"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
	return (
		<Sonner
			richColors
			toastOptions={{
				style: {
					background: "var(--rb-card)",
					border: "1px solid var(--rb-border)",
					color: "var(--rb-text)",
				},
			}}
		/>
	);
}

