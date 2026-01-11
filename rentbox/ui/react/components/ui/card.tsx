import * as React from "react";
import { cn } from "./cn";

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function Card(
	{ className, ...props },
	ref,
) {
	return (
		<div
			ref={ref}
			className={cn("rounded-xl border border-gray-200 bg-white shadow-sm", className)}
			{...props}
		/>
	);
});

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
	function CardHeader({ className, ...props }, ref) {
		return <div ref={ref} className={cn("p-4 pb-2", className)} {...props} />;
	},
);

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
	function CardTitle({ className, ...props }, ref) {
		return <h3 ref={ref} className={cn("text-base font-semibold", className)} {...props} />;
	},
);

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
	function CardContent({ className, ...props }, ref) {
		return <div ref={ref} className={cn("p-4 pt-2", className)} {...props} />;
	},
);

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
	function CardFooter({ className, ...props }, ref) {
		return <div ref={ref} className={cn("p-4 pt-2", className)} {...props} />;
	},
);

