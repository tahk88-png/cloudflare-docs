interface LoadingSpinnerProps {
	size?: "sm" | "md" | "lg";
	text?: string;
}

export function LoadingSpinner({
	size = "md",
	text = "Loading...",
}: LoadingSpinnerProps) {
	const sizeClasses = {
		sm: "rentbox-spinner--sm",
		md: "rentbox-spinner--md",
		lg: "rentbox-spinner--lg",
	};

	return (
		<div className="rentbox-loading">
			<div className={`rentbox-spinner ${sizeClasses[size]}`}>
				<div className="rentbox-spinner__ring"></div>
			</div>
			{text && <p className="rentbox-loading__text">{text}</p>}
		</div>
	);
}
