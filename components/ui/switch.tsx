import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
	React.ElementRef<typeof SwitchPrimitives.Root>,
	React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
	<SwitchPrimitives.Root
		ref={ref}
		className={cn(
			"peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-[var(--rb-border)] bg-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 data-[state=checked]:border-[var(--rb-primary)] data-[state=checked]:bg-[var(--rb-primary)] ring-offset-[hsl(var(--background))]",
			className,
		)}
		{...props}
	>
		<SwitchPrimitives.Thumb
			className={cn(
				"pointer-events-none block h-4 w-4 translate-x-0.5 rounded-full bg-[var(--rb-disabled)] shadow-sm ring-0 transition-transform data-[state=checked]:translate-x-[18px] data-[state=checked]:bg-white",
			)}
		/>
	</SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };

