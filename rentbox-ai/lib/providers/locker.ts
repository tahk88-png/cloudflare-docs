import mqtt from 'mqtt';
import { Locker, Compartment } from '../types';

export interface LockerOpenRequest {
  locker: Locker;
  compartment: Compartment;
  action: 'open' | 'close';
  code?: string;
}

export interface LockerOpenResult {
  success: boolean;
  error?: string;
  details?: any;
}

// Base Locker API adapter
export abstract class LockerAdapter {
  abstract open(request: LockerOpenRequest): Promise<LockerOpenResult>;
  abstract close?(request: LockerOpenRequest): Promise<LockerOpenResult>;
  abstract getStatus?(locker: Locker, compartment: Compartment): Promise<any>;
}

// HTTP-based locker adapter
export class HTTPLockerAdapter extends LockerAdapter {
  private apiKey: string;

  constructor() {
    super();
    this.apiKey = process.env.LOCKER_API_KEY || '';
  }

  async open(request: LockerOpenRequest): Promise<LockerOpenResult> {
    if (!request.locker.api_endpoint) {
      return {
        success: false,
        error: 'No API endpoint configured for this locker'
      };
    }

    try {
      const response = await fetch(`${request.locker.api_endpoint}/open`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          compartment_number: request.compartment.compartment_number,
          action: request.action,
          code: request.code
        })
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          details: data
        };
      } else {
        const error = await response.text();
        return {
          success: false,
          error: `HTTP ${response.status}: ${error}`
        };
      }
    } catch (error: any) {
      console.error('HTTP Locker API error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getStatus(locker: Locker, compartment: Compartment): Promise<any> {
    if (!locker.api_endpoint) {
      throw new Error('No API endpoint configured');
    }

    const response = await fetch(
      `${locker.api_endpoint}/status/${compartment.compartment_number}`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      }
    );

    return response.json();
  }
}

// MQTT-based locker adapter
export class MQTTLockerAdapter extends LockerAdapter {
  private client: mqtt.MqttClient | null = null;
  private brokerUrl: string;
  private username?: string;
  private password?: string;

  constructor() {
    super();
    this.brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
    this.username = process.env.MQTT_USERNAME;
    this.password = process.env.MQTT_PASSWORD;
  }

  private getClient(): mqtt.MqttClient {
    if (!this.client) {
      this.client = mqtt.connect(this.brokerUrl, {
        username: this.username,
        password: this.password,
        reconnectPeriod: 1000
      });

      this.client.on('error', (error) => {
        console.error('MQTT connection error:', error);
      });
    }

    return this.client;
  }

  async open(request: LockerOpenRequest): Promise<LockerOpenResult> {
    if (!request.locker.mqtt_topic) {
      return {
        success: false,
        error: 'No MQTT topic configured for this locker'
      };
    }

    return new Promise((resolve) => {
      const client = this.getClient();
      const topic = `${request.locker.mqtt_topic}/command`;
      const responseTopic = `${request.locker.mqtt_topic}/response`;

      const message = JSON.stringify({
        compartment: request.compartment.compartment_number,
        action: request.action,
        code: request.code,
        timestamp: new Date().toISOString()
      });

      // Set up response listener with timeout
      const timeout = setTimeout(() => {
        client.unsubscribe(responseTopic);
        resolve({
          success: false,
          error: 'MQTT response timeout'
        });
      }, 10000); // 10 second timeout

      client.subscribe(responseTopic, (err) => {
        if (err) {
          clearTimeout(timeout);
          resolve({
            success: false,
            error: `MQTT subscribe error: ${err.message}`
          });
          return;
        }

        client.once('message', (topic, payload) => {
          clearTimeout(timeout);
          client.unsubscribe(responseTopic);

          try {
            const response = JSON.parse(payload.toString());
            resolve({
              success: response.success || false,
              error: response.error,
              details: response
            });
          } catch (error) {
            resolve({
              success: false,
              error: 'Invalid MQTT response format'
            });
          }
        });

        // Publish the command
        client.publish(topic, message, (err) => {
          if (err) {
            clearTimeout(timeout);
            client.unsubscribe(responseTopic);
            resolve({
              success: false,
              error: `MQTT publish error: ${err.message}`
            });
          }
        });
      });
    });
  }

  disconnect(): void {
    if (this.client) {
      this.client.end();
      this.client = null;
    }
  }
}

// Factory function to get the appropriate adapter
export function getLockerAdapter(locker: Locker): LockerAdapter {
  if (locker.api_type === 'mqtt') {
    return new MQTTLockerAdapter();
  } else {
    return new HTTPLockerAdapter();
  }
}

// High-level locker service
export class LockerService {
  async openCompartment(
    locker: Locker,
    compartment: Compartment,
    code: string
  ): Promise<LockerOpenResult> {
    const adapter = getLockerAdapter(locker);
    
    return adapter.open({
      locker,
      compartment,
      action: 'open',
      code
    });
  }

  async closeCompartment(
    locker: Locker,
    compartment: Compartment
  ): Promise<LockerOpenResult> {
    const adapter = getLockerAdapter(locker);
    
    return adapter.open({
      locker,
      compartment,
      action: 'close'
    });
  }
}
