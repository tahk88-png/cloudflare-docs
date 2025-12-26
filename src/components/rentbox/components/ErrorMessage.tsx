interface ErrorMessageProps {
	title?: string;
	message: string;
	onRetry?: () => void;
}

export function ErrorMessage({
	title = "Something went wrong",
	message,
	onRetry,
}: ErrorMessageProps) {
	return (
		<div className="rentbox-error">
			<div className="rentbox-error__icon">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<circle cx="12" cy="12" r="10" />
					<line x1="12" y1="8" x2="12" y2="12" />
					<line x1="12" y1="16" x2="12.01" y2="16" />
				</svg>
			</div>
			<h3 className="rentbox-error__title">{title}</h3>
			<p className="rentbox-error__message">{message}</p>
			{onRetry && (
				<button onClick={onRetry} className="rentbox-btn rentbox-btn--secondary">
					Try Again
				</button>
			)}
		</div>
	);
}
