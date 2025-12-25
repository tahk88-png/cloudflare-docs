import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps
	extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
	({ className, ...props }, ref) => {
		return (
			<textarea
				ref={ref}
				className={cn(
					"flex min-h-[96px] w-full rounded-lg border border-[var(--rb-border)] bg-white px-3 py-2 text-sm text-[var(--rb-text)] placeholder:text-[var(--rb-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[var(--rb-bg)] disabled:text-[var(--rb-muted)] ring-offset-[hsl(var(--background))]",
					className,
				)}
				{...props}
			/>
		);
	},
);
Textarea.displayName = "Textarea";

export { Textarea };

