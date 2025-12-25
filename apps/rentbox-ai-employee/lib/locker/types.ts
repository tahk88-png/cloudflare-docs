export type LockerAdapterType = "http" | "mqtt";

export type OpenCompartmentInput = {
  lockerId: string;
  compartmentCode: string;
  adapterRef?: string | null;
};

export type OpenCompartmentResult = {
  ok: boolean;
  provider: LockerAdapterType;
  raw?: unknown;
};

export interface LockerAdapter {
  type: LockerAdapterType;
  openCompartment(input: OpenCompartmentInput): Promise<OpenCompartmentResult>;
}

