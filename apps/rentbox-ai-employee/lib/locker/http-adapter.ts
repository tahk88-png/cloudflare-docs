import type { LockerAdapter, OpenCompartmentInput, OpenCompartmentResult } from "./types";

export class HttpLockerAdapter implements LockerAdapter {
  public type: "http" = "http";
  private baseUrl: string;
  private apiKey?: string;

  constructor(params: { baseUrl: string; apiKey?: string }) {
    this.baseUrl = params.baseUrl;
    this.apiKey = params.apiKey;
  }

  async openCompartment(input: OpenCompartmentInput): Promise<OpenCompartmentResult> {
    // This is intentionally minimal: it defines the abstraction point.
    // A real implementation would call the locker provider API here.
    const res = await fetch(`${this.baseUrl.replace(/\/+$/, "")}/lockers/${input.lockerId}/open`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {})
      },
      body: JSON.stringify({ compartmentCode: input.compartmentCode, adapterRef: input.adapterRef ?? undefined })
    });
    const raw = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, provider: "http", raw };
    }
    return { ok: true, provider: "http", raw };
  }
}

