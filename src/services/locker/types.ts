/**
 * Locker Access Service Types
 * Rentbox.ee - Physical locker control service
 */

export interface LockerEvent {
	id: string;
	locker_id: string;
	action: LockerAction;
	result: LockerActionResult;
	timestamp: Date;
	booking_id?: string;
	user_id?: string;
	admin_override?: boolean;
	fallback_method?: FallbackMethod;
	error_message?: string;
	retry_count?: number;
}

export type LockerAction = "open" | "close" | "status_check";

export type LockerActionResult = "success" | "failure" | "timeout" | "hardware_error" | "unauthorized";

export type FallbackMethod = "pin" | "sms";

export interface LockerStatus {
	locker_id: string;
	is_open: boolean;
	is_available: boolean;
	last_action?: LockerAction;
	last_action_time?: Date;
	hardware_status: "online" | "offline" | "error";
	booking_id?: string;
}

export interface LockerControlRequest {
	locker_id: string;
	booking_id: string;
	user_id?: string;
	admin_override?: boolean;
}

export interface LockerControlResponse {
	success: boolean;
	locker_id: string;
	action: LockerAction;
	result: LockerActionResult;
	event_id: string;
	fallback_available?: boolean;
	fallback_method?: FallbackMethod;
	message?: string;
}

export interface BookingInfo {
	booking_id: string;
	locker_id: string;
	user_id: string;
	start_time: Date;
	end_time: Date;
	is_active: boolean;
}

export interface HardwareResponse {
	success: boolean;
	locker_id: string;
	error?: string;
	timeout?: boolean;
}
