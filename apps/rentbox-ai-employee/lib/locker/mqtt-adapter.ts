import type { LockerAdapter, OpenCompartmentInput, OpenCompartmentResult } from "./types";

export class MqttLockerAdapter implements LockerAdapter {
  public type: "mqtt" = "mqtt";

  constructor(_params: { brokerUrl: string; username?: string; password?: string }) {
    // v1 placeholder: MQTT client wiring depends on deployment environment.
  }

  async openCompartment(input: OpenCompartmentInput): Promise<OpenCompartmentResult> {
    // v1 placeholder: publish to a topic like `${adapterRef}/open`.
    return {
      ok: false,
      provider: "mqtt",
      raw: { error: "mqtt_adapter_not_implemented", input }
    };
  }
}

