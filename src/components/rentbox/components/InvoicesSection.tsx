import type { Invoice } from "../types";
import { InvoiceCard } from "./InvoiceCard";

interface InvoicesSectionProps {
	invoices: Invoice[];
}

export function InvoicesSection({ invoices }: InvoicesSectionProps) {
	const pendingInvoices = invoices.filter((inv) => inv.status === "pending");
	const paidInvoices = invoices.filter((inv) => inv.status === "paid");
	const otherInvoices = invoices.filter(
		(inv) => inv.status !== "pending" && inv.status !== "paid",
	);

	return (
		<section className="rentbox-section">
			<div className="rentbox-section__header">
				<h2 className="rentbox-section__title">Invoices & Payments</h2>
				{invoices.length > 0 && (
					<span className="rentbox-section__count">{invoices.length}</span>
				)}
			</div>

			{invoices.length === 0 ? (
				<div className="rentbox-empty">
					<p className="rentbox-empty__text">No invoices yet</p>
				</div>
			) : (
				<div className="rentbox-invoices">
					{pendingInvoices.length > 0 && (
						<div className="rentbox-invoices__group">
							<h3 className="rentbox-invoices__group-title">
								Pending Payment ({pendingInvoices.length})
							</h3>
							<div className="rentbox-invoices__list">
								{pendingInvoices.map((invoice) => (
									<InvoiceCard key={invoice.id} invoice={invoice} />
								))}
							</div>
						</div>
					)}

					{paidInvoices.length > 0 && (
						<div className="rentbox-invoices__group">
							<h3 className="rentbox-invoices__group-title">
								Paid ({paidInvoices.length})
							</h3>
							<div className="rentbox-invoices__list">
								{paidInvoices.map((invoice) => (
									<InvoiceCard key={invoice.id} invoice={invoice} />
								))}
							</div>
						</div>
					)}

					{otherInvoices.length > 0 && (
						<div className="rentbox-invoices__group">
							<h3 className="rentbox-invoices__group-title">Other</h3>
							<div className="rentbox-invoices__list">
								{otherInvoices.map((invoice) => (
									<InvoiceCard key={invoice.id} invoice={invoice} />
								))}
							</div>
						</div>
					)}
				</div>
			)}
		</section>
	);
}
