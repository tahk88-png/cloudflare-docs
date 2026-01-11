import * as React from "react";
import { cn } from "./cn";

export interface SelectOption<T extends string | number = string> {
	value: T;
	label: string;
	disabled?: boolean;
}

export interface SelectProps<T extends string | number = string>
	extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange"> {
	value: T;
	onValueChange: (value: T) => void;
	options: Array<SelectOption<T>>;
}

export function Select<T extends string | number>({ className, value, onValueChange, options, ...props }: SelectProps<T>) {
	return (
		<select
			className={cn(
				"h-10 rounded-md border border-gray-300 bg-white px-3 text-sm",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 focus-visible:ring-offset-2",
				className,
			)}
			value={String(value)}
			onChange={(e) => onValueChange(e.target.value as T)}
			{...props}
		>
			{options.map((o) => (
				<option key={String(o.value)} value={String(o.value)} disabled={o.disabled}>
					{o.label}
				</option>
			))}
		</select>
	);
}

