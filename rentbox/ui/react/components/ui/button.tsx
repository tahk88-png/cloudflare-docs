import * as React from "react";
import { cn } from "./cn";

export type ButtonVariant = "default" | "secondary" | "outline" | "ghost" | "destructive";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant;
	size?: ButtonSize;
}

const variantClass: Record<ButtonVariant, string> = {
	default: "bg-black text-white hover:bg-gray-900",
	secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
	outline: "border border-gray-300 bg-white text-gray-900 hover:bg-gray-50",
	ghost: "bg-transparent text-gray-900 hover:bg-gray-100",
	destructive: "bg-red-600 text-white hover:bg-red-700",
};

const sizeClass: Record<ButtonSize, string> = {
	sm: "h-9 px-3 text-sm",
	md: "h-10 px-4 text-sm",
	lg: "h-11 px-5 text-base",
	icon: "h-10 w-10 p-0",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
	{ className, variant = "default", size = "md", type = "button", ...props },
	ref,
) {
	return (
		<button
			ref={ref}
			type={type}
			className={cn(
				"inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 focus-visible:ring-offset-2",
				"disabled:pointer-events-none disabled:opacity-50",
				variantClass[variant],
				sizeClass[size],
				className,
			)}
			{...props}
		/>
	);
});

