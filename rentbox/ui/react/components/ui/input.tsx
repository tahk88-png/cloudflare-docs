import * as React from "react";
import { cn } from "./cn";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
	{ className, ...props },
	ref,
) {
	return (
		<input
			ref={ref}
			className={cn(
				"h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 focus-visible:ring-offset-2",
				"disabled:opacity-50",
				className,
			)}
			{...props}
		/>
	);
});

