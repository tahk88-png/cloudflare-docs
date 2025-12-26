/**
 * Service initialization helper
 * Creates configured LockerAccessService instance
 */

import { LockerAccessService } from "./service";
import { D1Database } from "./database";
import { LockerHardwareController } from "./hardware";
import { FallbackAccessService } from "./fallback";
import { BookingValidationService } from "./booking";

export interface LockerServiceEnv {
	DB?: any; // D1Database instance
	HARDWARE_ENDPOINT?: string;
	SMS_API_KEY?: string;
	SMS_ENDPOINT?: string;
	BOOKING_API_ENDPOINT?: string;
	BOOKING_API_KEY?: string;
	ADMIN_API_KEY?: string;
}

/**
 * Initialize LockerAccessService with environment configuration
 */
export function createLockerService(env: LockerServiceEnv): LockerAccessService {
	if (!env.DB) {
		throw new Error("Database (DB) is required");
	}

	const database = new D1Database(env.DB);

	const hardware = new LockerHardwareController({
		hardwareEndpoint: env.HARDWARE_ENDPOINT,
	});

	const fallback = new FallbackAccessService({
		smsProvider:
			env.SMS_API_KEY && env.SMS_ENDPOINT
				? {
						apiKey: env.SMS_API_KEY,
						endpoint: env.SMS_ENDPOINT,
					}
				: undefined,
	});

	const booking = new BookingValidationService(
		env.BOOKING_API_ENDPOINT,
		env.BOOKING_API_KEY,
	);

	return new LockerAccessService({
		database,
		hardware,
		fallback,
		booking,
		enableFallback: true,
		adminApiKey: env.ADMIN_API_KEY,
	});
}
