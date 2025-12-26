import type { Agreement } from "~/types/dashboard";

interface AgreementsProps {
	agreements: Agreement[];
}

function AgreementTypeBadge({ type }: { type: Agreement["type"] }) {
	const typeLabels = {
		rental: "Rental Agreement",
		terms: "Terms & Conditions",
		privacy: "Privacy Policy",
	};

	return (
		<span className="sl-badge default">{typeLabels[type]}</span>
	);
}

export default function Agreements({ agreements }: AgreementsProps) {
	if (agreements.length === 0) {
		return (
			<div className="text-center py-8 text-gray-500">
				<p>No signed agreements</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{agreements.map((agreement) => (
				<div
					key={agreement.id}
					className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 sm:p-6 hover:shadow-md transition-shadow bg-white dark:bg-gray-900"
				>
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-2 mb-3">
								<AgreementTypeBadge type={agreement.type} />
							</div>
							<div className="text-sm text-gray-600 dark:text-gray-400">
								<p className="flex flex-wrap gap-1">
									<strong className="text-gray-700 dark:text-gray-300">Signed:</strong>
									<span>
										{new Date(agreement.signedDate).toLocaleDateString("en-US", {
											month: "short",
											day: "numeric",
											year: "numeric",
										})}
									</span>
								</p>
							</div>
						</div>
						<a
							href={agreement.downloadUrl}
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
