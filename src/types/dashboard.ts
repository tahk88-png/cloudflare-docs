// Types for Rentbox.ee User Dashboard

export type RentalStatus = 
	| "active" 
	| "upcoming" 
	| "completed" 
	| "cancelled";

export interface Rental {
	id: string;
	status: RentalStatus;
	startDate: string; // ISO date string
	endDate: string; // ISO date string
	lockerLocation: string;
	lockerNumber: string;
	itemName: string;
	itemImage?: string;
	timeLeft?: string; // e.g., "2 days", "5 hours"
	countdown?: number; // milliseconds until start/end
}

export interface Invoice {
	id: string;
	number: string;
	date: string; // ISO date string
	amount: number;
	currency: string;
	status: "paid" | "pending" | "overdue";
	downloadUrl: string;
	rentalId?: string;
}

export interface Agreement {
	id: string;
	type: "rental" | "terms" | "privacy";
	signedDate: string; // ISO date string
	downloadUrl: string;
	rentalId?: string;
}

export interface DashboardData {
	activeRentals: Rental[];
	upcomingRentals: Rental[];
	pastRentals: Rental[];
	invoices: Invoice[];
	agreements: Agreement[];
}

export interface Booking {
	id: string;
	rental: Rental;
	invoice?: Invoice;
	agreement?: Agreement;
}
