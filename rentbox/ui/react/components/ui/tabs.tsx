import { cn } from "./cn";

export interface TabsOption<T extends string> {
	value: T;
	label: string;
}

export interface TabsProps<T extends string> {
	value: T;
	onValueChange: (v: T) => void;
	options: Array<TabsOption<T>>;
	className?: string;
}

export function Tabs<T extends string>({ value, onValueChange, options, className }: TabsProps<T>) {
	return (
		<div className={cn("inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1", className)} role="tablist">
			{options.map((o) => {
				const active = o.value === value;
				return (
					<button
						key={o.value}
						role="tab"
						aria-selected={active}
						className={cn(
							"rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
							active ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900",
						)}
						onClick={() => onValueChange(o.value)}
						type="button"
					>
						{o.label}
					</button>
				);
			})}
		</div>
	);
}

