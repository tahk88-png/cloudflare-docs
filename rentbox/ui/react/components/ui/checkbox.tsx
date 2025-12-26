import * as React from "react";
import { cn } from "./cn";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
	label?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
	{ className, label, ...props },
	ref,
) {
	return (
		<label className="inline-flex items-center gap-2 text-sm">
			<input
				ref={ref}
				type="checkbox"
				className={cn(
					"h-4 w-4 rounded border-gray-300 text-black accent-black",
					"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 focus-visible:ring-offset-2",
					className,
				)}
				{...props}
			/>
			{label ? <span className="text-gray-900">{label}</span> : null}
		</label>
	);
});

