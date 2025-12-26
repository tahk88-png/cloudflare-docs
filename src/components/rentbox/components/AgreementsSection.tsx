import type { Agreement } from "../types";
import { AgreementCard } from "./AgreementCard";

interface AgreementsSectionProps {
	agreements: Agreement[];
}

export function AgreementsSection({ agreements }: AgreementsSectionProps) {
	return (
		<section className="rentbox-section">
			<div className="rentbox-section__header">
				<h2 className="rentbox-section__title">Signed Agreements</h2>
				{agreements.length > 0 && (
					<span className="rentbox-section__count">{agreements.length}</span>
				)}
			</div>

			{agreements.length === 0 ? (
				<div className="rentbox-empty">
					<p className="rentbox-empty__text">No signed agreements yet</p>
				</div>
			) : (
				<div className="rentbox-agreements">
					{agreements.map((agreement) => (
						<AgreementCard key={agreement.id} agreement={agreement} />
					))}
				</div>
			)}
		</section>
	);
}
