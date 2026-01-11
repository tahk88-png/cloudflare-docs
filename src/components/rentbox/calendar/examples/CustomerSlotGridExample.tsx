import type { RentboxCalendarStatus } from "../../../../util/rentbox/calendar-status";
import { StatusBadge } from "../StatusBadge";

type Slot = {
	time: string; // local time (Europe/Tallinn)
	status: RentboxCalendarStatus;
	disabled?: boolean;
	reason?: string;
};

const slots: Slot[] = [
	{ time: "10:00", status: "available" },
	{ time: "10:30", status: "available" },
	{
		time: "11:00",
		status: "limited",
		reason: "Alles 1 komplekt saadaval",
	},
	{
		time: "11:30",
		status: "unavailable",
		disabled: true,
		reason: "Broneeritud (Makstud)",
	},
	{
		time: "12:00",
		status: "unavailable",
		disabled: true,
		reason: "Broneeritud (Ootel)",
	},
];

export function CustomerSlotGridExample() {
	return (
		<div style={{ display: "grid", gap: 8, maxWidth: 420 }}>
			{slots.map((slot) => {
				const isDisabled = Boolean(slot.disabled);
				return (
					<button
						key={slot.time}
						type="button"
						disabled={isDisabled}
						aria-disabled={isDisabled}
						title={slot.reason}
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							gap: 12,
							padding: "10px 12px",
							borderRadius: 8,
							border: "1px solid var(--sl-color-gray-5)",
							background: isDisabled
								? "var(--sl-color-backdrop-overlay)"
								: "var(--sl-color-bg)",
							color: "var(--sl-color-text)",
							cursor: isDisabled ? "not-allowed" : "pointer",
							textAlign: "left",
						}}
					>
						<span style={{ fontSize: 14, fontWeight: 600 }}>{slot.time}</span>
						<StatusBadge status={slot.status} title={slot.reason} />
					</button>
				);
			})}
		</div>
	);
}

