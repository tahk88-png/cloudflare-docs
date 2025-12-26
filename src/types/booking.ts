export interface Booking {
	id: string;
	user_id: string;
	tool_id: string;
	start_at: string; // ISO 8601 date string
	end_at: string; // ISO 8601 date string
	status: "pending" | "active" | "completed" | "overdue" | "returned";
	return_status?: "pending" | "confirmed" | "disputed" | "approved";
	return_requested_at?: string; // ISO 8601 date string
	return_confirmed_at?: string; // ISO 8601 date string
	return_photos?: string[]; // Array of photo URLs
	admin_notes?: string;
	created_at: string;
	updated_at: string;
}

export interface ReturnRequest {
	booking_id: string;
	photos?: File[];
}

export interface ReturnResponse {
	booking: Booking;
	overdue: boolean;
	message: string;
}

export interface AdminReturn {
	booking_id: string;
	user_id: string;
	tool_id: string;
	tool_name?: string;
	user_email?: string;
	end_at: string;
	return_requested_at: string;
	return_confirmed_at?: string;
	return_status: "pending" | "confirmed" | "disputed" | "approved";
	return_photos?: string[];
	overdue: boolean;
	days_overdue?: number;
	admin_notes?: string;
}
