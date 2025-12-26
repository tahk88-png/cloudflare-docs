import type { Agreement } from "../types";
import { formatDate } from "../utils/dateUtils";

interface AgreementCardProps {
	agreement: Agreement;
}

function DocumentIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="20"
			height="20"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className="rentbox-icon"
		>
			<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
			<polyline points="14 2 14 8 20 8" />
		</svg>
	);
}

function DownloadIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
			<polyline points="7 10 12 15 17 10" />
			<line x1="12" y1="15" x2="12" y2="3" />
		</svg>
	);
}

function ViewIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
			<circle cx="12" cy="12" r="3" />
		</svg>
	);
}

export function AgreementCard({ agreement }: AgreementCardProps) {
	return (
		<div className="rentbox-agreement">
			<div className="rentbox-agreement__icon">
				<DocumentIcon />
			</div>

			<div className="rentbox-agreement__content">
				<div className="rentbox-agreement__header">
					<span className="rentbox-agreement__title">Rental Agreement</span>
					<span className="rentbox-agreement__locker">{agreement.lockerInfo}</span>
				</div>

				<div className="rentbox-agreement__details">
					<span className="rentbox-agreement__date">
						Signed: {formatDate(agreement.signedDate)}
					</span>
				</div>
			</div>

			<div className="rentbox-agreement__actions">
				<a
					href={agreement.documentUrl}
					className="rentbox-btn rentbox-btn--icon"
					title="View Agreement"
					target="_blank"
					rel="noopener noreferrer"
				>
					<ViewIcon />
				</a>
				<a
					href={agreement.documentUrl}
					className="rentbox-btn rentbox-btn--icon"
					title="Download Agreement"
					download
				>
					<DownloadIcon />
				</a>
			</div>
		</div>
	);
}
