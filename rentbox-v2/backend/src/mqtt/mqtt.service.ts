import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mqtt from 'mqtt';

@Injectable()
export class MqttService {
  private client: mqtt.MqttClient;
  private readonly logger = new Logger(MqttService.name);

  constructor(private config: ConfigService) {
    const brokerUrl = this.config.get<string>('MQTT_BROKER_URL') || 'mqtt://localhost:1883';
    const username = this.config.get<string>('MQTT_USERNAME');
    const password = this.config.get<string>('MQTT_PASSWORD');

    const options: mqtt.IClientOptions = {
      username,
      password,
      reconnectPeriod: 5000,
    };

    this.client = mqtt.connect(brokerUrl, options);

    this.client.on('connect', () => {
      this.logger.log('Connected to MQTT broker');
    });

    this.client.on('error', (error) => {
      this.logger.error('MQTT error:', error);
    });
  }

  /**
   * Open compartment via MQTT
   */
  async openCompartment(lockerTopic: string, compartmentNumber: string): Promise<{ success: boolean; responseTime?: number }> {
    return new Promise((resolve) => {
      const topic = `${lockerTopic}/compartments/${compartmentNumber}/open`;
      const startTime = Date.now();

      // Set timeout
      const timeout = setTimeout(() => {
        resolve({ success: false });
      }, 10000); // 10 second timeout

      // Subscribe to response topic
      const responseTopic = `${lockerTopic}/compartments/${compartmentNumber}/status`;
      this.client.subscribe(responseTopic, (err) => {
        if (err) {
          clearTimeout(timeout);
          resolve({ success: false });
          return;
        }

        // Publish open command
        this.client.publish(topic, JSON.stringify({ action: 'open' }), (err) => {
          if (err) {
            clearTimeout(timeout);
            resolve({ success: false });
            return;
          }

          // Wait for response
          const messageHandler = (receivedTopic: string, message: Buffer) => {
            if (receivedTopic === responseTopic) {
              clearTimeout(timeout);
              this.client.unsubscribe(responseTopic);
              this.client.removeListener('message', messageHandler);

              const response = JSON.parse(message.toString());
              const responseTime = Date.now() - startTime;

              if (response.status === 'opened') {
                resolve({ success: true, responseTime });
              } else {
                resolve({ success: false, responseTime });
              }
            }
          };

          this.client.on('message', messageHandler);
        });
      });
    });
  }
}
