import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
	"inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
	{
		variants: {
			variant: {
				default:
					"border-transparent bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]",
				secondary:
					"border-transparent bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]",
				outline: "border-[var(--rb-border)] text-[var(--rb-text)]",
				destructive:
					"border-transparent bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))]",
			},
		},
		defaultVariants: {
			variant: "secondary",
		},
	},
);

export interface BadgeProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
	return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

