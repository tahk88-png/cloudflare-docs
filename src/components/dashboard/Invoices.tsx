import type { Invoice } from "~/types/dashboard";

interface InvoicesProps {
	invoices: Invoice[];
}

function InvoiceStatusBadge({ status }: { status: Invoice["status"] }) {
	const statusConfig = {
		paid: {
			label: "Paid",
			variant: "success" as const,
		},
		pending: {
			label: "Pending",
			variant: "caution" as const,
		},
		overdue: {
			label: "Overdue",
			variant: "danger" as const,
		},
	};

	const config = statusConfig[status];

	return <span className={`sl-badge ${config.variant}`}>{config.label}</span>;
}

export default function Invoices({ invoices }: InvoicesProps) {
	if (invoices.length === 0) {
		return (
			<div className="text-center py-8 text-gray-500">
				<p>No invoices</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{invoices.map((invoice) => (
				<div
					key={invoice.id}
					className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 sm:p-6 hover:shadow-md transition-shadow bg-white dark:bg-gray-900"
				>
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
						<div className="flex-1 min-w-0">
							<div className="flex flex-wrap items-center gap-2 mb-3">
								<h3 className="font-semibold text-lg sm:text-xl">{invoice.number}</h3>
								<InvoiceStatusBadge status={invoice.status} />
							</div>
							<div className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5">
								<p className="flex flex-wrap gap-1">
									<strong className="text-gray-700 dark:text-gray-300">Date:</strong>
									<span>
										{new Date(invoice.date).toLocaleDateString("en-US", {
											month: "short",
											day: "numeric",
											year: "numeric",
										})}
									</span>
								</p>
								<p className="flex flex-wrap gap-1">
									<strong className="text-gray-700 dark:text-gray-300">Amount:</strong>
									<span>
										{invoice.amount.toFixed(2)} {invoice.currency}
									</span>
								</p>
							</div>
						</div>
						<a
							href={invoice.downloadUrl}
							download
							className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors whitespace-nowrap text-center w-full sm:w-auto"
						>
							Download
						</a>
					</div>
				</div>
			))}
		</div>
	);
}
