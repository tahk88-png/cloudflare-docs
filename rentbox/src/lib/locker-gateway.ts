// Mock HTTP Gateway Adapter
// For local testing: http://localhost:8080/v1
export const GATEWAY_URL = process.env.GATEWAY_URL || "https://gateway.mock.rentbox.ee/v1";
export const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN || "mock-token";

export interface GatewayResponse {
  success: boolean;
  message?: string;
}

export async function openCompartmentGateway(lockerId: string, compartmentId: string, correlationId: string): Promise<GatewayResponse> {
  // In v2, compartmentId needs to be mapped to a Number if possible, or we assume externalId is the number string.
  // For now, let's mock the number as '1' or derive it.
  const compartmentNumber = 1; // TODO: Fetch from DB using compartmentId -> doorNumber

  try {
      const res = await fetch(`${GATEWAY_URL}/lockers/${lockerId}/compartments/${compartmentNumber}/open`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GATEWAY_TOKEN}`
        },
        body: JSON.stringify({ correlation_id: correlationId })
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
      // Fallback for demo if gateway not running
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
