import mqtt from 'mqtt';

export interface LockerOpenRequest {
  lockerId: number;
  compartmentId: number;
  bookingId: number;
  pickupCode?: string;
}

export interface LockerOpenResponse {
  success: boolean;
  message: string;
}

export async function openLocker(request: LockerOpenRequest): Promise<LockerOpenResponse> {
  // This is a placeholder - implement based on your locker API
  const apiType = process.env.LOCKER_API_TYPE || 'http';
  
  if (apiType === 'mqtt') {
    return openLockerMQTT(request);
  } else {
    return openLockerHTTP(request);
  }
}

async function openLockerHTTP(request: LockerOpenRequest): Promise<LockerOpenResponse> {
  try {
    const apiUrl = process.env.LOCKER_API_URL || 'http://localhost:3001/api/locker';
    const response = await fetch(`${apiUrl}/open`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locker_id: request.lockerId,
        compartment_id: request.compartmentId,
        booking_id: request.bookingId,
        pickup_code: request.pickupCode,
      }),
    });

    if (!response.ok) {
      throw new Error(`Locker API error: ${response.statusText}`);
    }

    const data = await response.json();
    return { success: true, message: data.message || 'Locker opened successfully' };
  } catch (error) {
    console.error('Failed to open locker via HTTP:', error);
    return { success: false, message: 'Failed to open locker' };
  }
}

async function openLockerMQTT(request: LockerOpenRequest): Promise<LockerOpenResponse> {
  return new Promise((resolve) => {
    const broker = process.env.LOCKER_MQTT_BROKER || 'mqtt://localhost:1883';
    const client = mqtt.connect(broker);

    client.on('connect', () => {
      const topic = process.env.LOCKER_MQTT_TOPIC || `locker/${request.lockerId}/open`;
      const message = JSON.stringify({
        compartment_id: request.compartmentId,
        booking_id: request.bookingId,
        pickup_code: request.pickupCode,
      });

      client.publish(topic, message, (err) => {
        client.end();
        if (err) {
          resolve({ success: false, message: 'Failed to send MQTT command' });
        } else {
          resolve({ success: true, message: 'Locker open command sent' });
        }
      });
    });

    client.on('error', () => {
      client.end();
      resolve({ success: false, message: 'MQTT connection failed' });
    });
  });
}
