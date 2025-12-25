import { dbQuery } from "../db";
import { assertLockerOpenAllowed } from "../safety";
import { logAiAction } from "../repos/ai-actions";
import { HttpLockerAdapter } from "./http-adapter";
import { MqttLockerAdapter } from "./mqtt-adapter";
import type { LockerAdapterType } from "./types";

type CompartmentJoin = {
  booking_id: string;
  booking_paid: boolean;
  booking_start_at: string;
  booking_end_at: string;
  booking_compartment_id: string;
  locker_id: string;
  locker_adapter_type: LockerAdapterType;
  locker_adapter_config: any;
  compartment_code: string;
  compartment_adapter_ref: string | null;
};

export async function openLockerForBooking(params: { bookingId: string; compartmentId: string }) {
  const ctx = await dbQuery<CompartmentJoin>(
    `
    select
      b.id as booking_id,
      b.paid as booking_paid,
      b.start_at as booking_start_at,
      b.end_at as booking_end_at,
      b.compartment_id as booking_compartment_id,
      l.id as locker_id,
      l.adapter_type as locker_adapter_type,
      l.adapter_config as locker_adapter_config,
      c.code as compartment_code,
      c.adapter_ref as compartment_adapter_ref
    from bookings b
    join compartments c on c.id = b.compartment_id
    join lockers l on l.id = c.locker_id
    where b.id = $1
    limit 1
    `,
    [params.bookingId]
  );
  const row = ctx.rows[0];
  if (!row) throw new Error("booking_not_found");

  assertLockerOpenAllowed({
    booking: {
      id: row.booking_id,
      external_id: null,
      user_id: null,
      product_id: null,
      compartment_id: row.booking_compartment_id,
      start_at: row.booking_start_at,
      end_at: row.booking_end_at,
      status: "active",
      paid: row.booking_paid,
      metadata: {}
    },
    compartmentId: params.compartmentId
  });

  let result: any;
  if (row.locker_adapter_type === "http") {
    const adapter = new HttpLockerAdapter({
      baseUrl: row.locker_adapter_config?.baseUrl ?? "",
      apiKey: row.locker_adapter_config?.apiKey
    });
    result = await adapter.openCompartment({
      lockerId: row.locker_id,
      compartmentCode: row.compartment_code,
      adapterRef: row.compartment_adapter_ref
    });
  } else {
    const adapter = new MqttLockerAdapter({
      brokerUrl: row.locker_adapter_config?.brokerUrl ?? ""
    });
    result = await adapter.openCompartment({
      lockerId: row.locker_id,
      compartmentCode: row.compartment_code,
      adapterRef: row.compartment_adapter_ref
    });
  }

  await logAiAction({
    booking_id: row.booking_id,
    user_id: null,
    action_type: "locker.open",
    reason: "Requested open via locker abstraction",
    outcome: result.ok ? "opened" : "failed",
    status: result.ok ? "success" : "failed",
    metadata: { provider: result.provider, raw: result.raw }
  });

  return result;
}

