import * as React from "react";
import { cn } from "~/lib/utils";

export interface RadioGroupProps
	extends React.HTMLAttributes<HTMLDivElement> {
	value?: string;
	onValueChange?: (value: string) => void;
}

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
	({ className, value, onValueChange, children, ...props }, ref) => {
		return (
			<div
				className={cn("space-y-2", className)}
				ref={ref}
				role="radiogroup"
				{...props}
			>
				{React.Children.map(children, (child) => {
					if (React.isValidElement(child)) {
						return React.cloneElement(child as React.ReactElement<any>, {
							checked: child.props.value === value,
							onChange: () => onValueChange?.(child.props.value),
						});
					}
					return child;
				})}
			</div>
		);
	}
);
RadioGroup.displayName = "RadioGroup";

export interface RadioGroupItemProps
	extends React.InputHTMLAttributes<HTMLInputElement> {
	value: string;
}

const RadioGroupItem = React.forwardRef<HTMLInputElement, RadioGroupItemProps>(
	({ className, value, checked, onChange, ...props }, ref) => {
		return (
			<div className="flex items-center space-x-2">
				<input
					type="radio"
					value={value}
					checked={checked}
					onChange={onChange}
					className={cn(
						"h-4 w-4 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500",
						className
					)}
					ref={ref}
					{...props}
				/>
			</div>
		);
	}
);
RadioGroupItem.displayName = "RadioGroupItem";

export { RadioGroup, RadioGroupItem };
