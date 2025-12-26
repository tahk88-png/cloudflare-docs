import type { Invoice } from "../types";
import { StatusBadge } from "./StatusBadge";
import { formatDate, formatCurrency } from "../utils/dateUtils";

interface InvoiceCardProps {
	invoice: Invoice;
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

function InvoiceIcon() {
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
			<line x1="16" y1="13" x2="8" y2="13" />
			<line x1="16" y1="17" x2="8" y2="17" />
			<polyline points="10 9 9 9 8 9" />
		</svg>
	);
}

export function InvoiceCard({ invoice }: InvoiceCardProps) {
	return (
		<div className="rentbox-invoice">
			<div className="rentbox-invoice__icon">
				<InvoiceIcon />
			</div>

			<div className="rentbox-invoice__content">
				<div className="rentbox-invoice__header">
					<span className="rentbox-invoice__id">Invoice #{invoice.id}</span>
					<StatusBadge status={invoice.status} size="sm" />
				</div>

				<div className="rentbox-invoice__details">
					<span className="rentbox-invoice__amount">
						{formatCurrency(invoice.amount, invoice.currency)}
					</span>
					<span className="rentbox-invoice__date">
						Issued: {formatDate(invoice.issuedDate)}
					</span>
					{invoice.status === "pending" && (
						<span className="rentbox-invoice__due">
							Due: {formatDate(invoice.dueDate)}
						</span>
					)}
					{invoice.paidDate && (
						<span className="rentbox-invoice__paid">
							Paid: {formatDate(invoice.paidDate)}
						</span>
					)}
				</div>
			</div>

			<a
				href={invoice.downloadUrl}
				className="rentbox-btn rentbox-btn--icon"
				title="Download Invoice"
				download
			>
				<DownloadIcon />
			</a>
		</div>
	);
}
