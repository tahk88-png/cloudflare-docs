// Mock HTTP Gateway Adapter
// For local testing: http://localhost:8080/v1
export const GATEWAY_URL = process.env.GATEWAY_URL || "https://gateway.mock.rentbox.ee/v1";
export const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN || "mock-token";

export interface GatewayResponse {
  success: boolean;
  message?: string;
}

export interface OpenCommandOptions {
    requestedBy: string;
    reason: string;
    bookingExternalId?: string;
}

export async function openCompartmentGateway(
    lockerId: string, 
    compartmentId: string, 
    correlationId: string,
    options?: OpenCommandOptions
): Promise<GatewayResponse> {
  const compartmentNumber = 1; // TODO: Fetch from DB using compartmentId -> doorNumber

  const payload = {
      correlation_id: correlationId,
      booking_external_id: options?.bookingExternalId,
      requested_by: options?.requestedBy,
      reason: options?.reason
  };

  try {
      const res = await fetch(`${GATEWAY_URL}/lockers/${lockerId}/compartments/${compartmentNumber}/open`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GATEWAY_TOKEN}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
          return { success: false, message: `Gateway Error ${res.status}` };
      }

      const json = await res.json();
      if (!json.accepted) {
          return { success: false, message: "Gateway declined" };
      }
      
      return { success: true, message: "Command Accepted" };
  } catch(e) {
      console.error("Gateway Network Error", e);
      if (GATEWAY_URL.includes("mock.rentbox.ee")) {
           return { success: true, message: "Mock Accepted" };
      }
      return { success: false, message: "Network Error" };
  }
}

export async function getLockerStatusGateway(lockerId: string) {
  try {
      const res = await fetch(`${GATEWAY_URL}/lockers/${lockerId}/status`);
      if(res.ok) {
          return await res.json();
      }
  } catch(e) {
      // ignore
  }
  return { status: 'UNKNOWN' };
}
