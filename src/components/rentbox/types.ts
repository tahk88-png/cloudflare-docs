// Rentbox.ee User Dashboard Types

export type RentalStatus =
	| "active"
	| "upcoming"
	| "completed"
	| "cancelled"
	| "overdue";

export type PaymentStatus = "paid" | "pending" | "overdue" | "refunded";

export interface LockerLocation {
	id: string;
	name: string;
	address: string;
	city: string;
	coordinates?: {
		lat: number;
		lng: number;
	};
}

export interface Rental {
	id: string;
	lockerNumber: string;
	lockerSize: "small" | "medium" | "large" | "extra-large";
	location: LockerLocation;
	status: RentalStatus;
	startDate: string; // ISO date string
	endDate: string; // ISO date string
	price: number;
	currency: string;
	agreementId?: string;
	invoiceId?: string;
}

export interface Invoice {
	id: string;
	rentalId: string;
	amount: number;
	currency: string;
	status: PaymentStatus;
	issuedDate: string; // ISO date string
	dueDate: string; // ISO date string
	paidDate?: string; // ISO date string
	downloadUrl: string;
}

export interface Agreement {
	id: string;
	rentalId: string;
	signedDate: string; // ISO date string
	documentUrl: string;
	lockerInfo: string;
}

export interface DashboardSummary {
	activeRentals: number;
	upcomingRentals: number;
	totalSpent: number;
	currency: string;
	memberSince: string; // ISO date string
}

export interface UserDashboardData {
	summary: DashboardSummary;
	user: {
		name: string;
		email: string;
	};
}

export interface BookingsResponse {
	rentals: Rental[];
}

export interface InvoicesResponse {
	invoices: Invoice[];
	agreements: Agreement[];
}

// API response types
export interface ApiResponse<T> {
	data: T;
	error?: string;
}
