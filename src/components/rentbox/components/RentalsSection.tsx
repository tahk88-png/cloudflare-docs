import type { Rental } from "../types";
import { RentalCard } from "./RentalCard";

interface RentalsSectionProps {
	title: string;
	rentals: Rental[];
	variant: "active" | "upcoming" | "past";
	emptyMessage: string;
	onRentAgain?: () => void;
}

export function RentalsSection({
	title,
	rentals,
	variant,
	emptyMessage,
	onRentAgain,
}: RentalsSectionProps) {
	return (
		<section className="rentbox-section">
			<div className="rentbox-section__header">
				<h2 className="rentbox-section__title">{title}</h2>
				{rentals.length > 0 && (
					<span className="rentbox-section__count">{rentals.length}</span>
				)}
			</div>

			{rentals.length === 0 ? (
				<div className="rentbox-empty">
					<p className="rentbox-empty__text">{emptyMessage}</p>
				</div>
			) : (
				<div className="rentbox-grid">
					{rentals.map((rental) => (
						<RentalCard
							key={rental.id}
							rental={rental}
							variant={variant}
							onRentAgain={onRentAgain}
						/>
					))}
				</div>
			)}
		</section>
	);
}
