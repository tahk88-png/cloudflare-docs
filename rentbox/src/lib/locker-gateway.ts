// Mock HTTP Gateway Adapter
export const GATEWAY_URL = "https://gateway.mock.rentbox.ee/api/v1";

export interface GatewayResponse {
  success: boolean;
  message?: string;
}

export async function openCompartmentGateway(lockerId: string, compartmentId: string, correlationId: string): Promise<GatewayResponse> {
  // In a real app, this would be:
  // const res = await fetch(`${GATEWAY_URL}/open`, {
  //   method: 'POST',
  //   body: JSON.stringify({ lockerId, compartmentId, correlationId })
  // });
  
  console.log(`[GATEWAY] POST /open`, { lockerId, compartmentId, correlationId });
  
  // Simulate Async behavior (Success is returned immediately as "Command Accepted", result comes via webhook)
  return { success: true, message: "Command Accepted" };
}

export async function getLockerStatusGateway(lockerId: string) {
  // Mock
  return { status: 'ONLINE', details: {} };
}
