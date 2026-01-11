import * as React from "react";
import { cn } from "./cn";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
	variant?: "default" | "destructive";
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(
	{ className, variant = "default", ...props },
	ref,
) {
	return (
		<div
			ref={ref}
			role="alert"
			className={cn(
				"rounded-lg border p-3 text-sm",
				variant === "destructive"
					? "border-red-200 bg-red-50 text-red-900"
					: "border-gray-200 bg-white text-gray-900",
				className,
			)}
			{...props}
		/>
	);
});

export const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
	function AlertTitle({ className, ...props }, ref) {
		return <p ref={ref} className={cn("mb-1 font-medium", className)} {...props} />;
	},
);

export const AlertDescription = React.forwardRef<
	HTMLParagraphElement,
	React.HTMLAttributes<HTMLParagraphElement>
>(function AlertDescription({ className, ...props }, ref) {
	return <p ref={ref} className={cn("text-gray-700", className)} {...props} />;
});

