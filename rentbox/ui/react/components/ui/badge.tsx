import * as React from "react";
import { cn } from "./cn";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
	variant?: "default" | "success" | "warning" | "destructive" | "muted" | "outline";
}

const variantClass: Record<NonNullable<BadgeProps["variant"]>, string> = {
	default: "bg-black text-white",
	success: "bg-green-100 text-green-900",
	warning: "bg-amber-100 text-amber-900",
	destructive: "bg-red-100 text-red-900",
	muted: "bg-gray-100 text-gray-800",
	outline: "border border-gray-300 text-gray-900",
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
	{ className, variant = "default", ...props },
	ref,
) {
	return (
		<span
			ref={ref}
			className={cn(
				"inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
				variantClass[variant],
				className,
			)}
			{...props}
		/>
	);
});

