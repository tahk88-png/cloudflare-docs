import { EventBlock } from "../EventBlock";
import { Legend } from "../Legend";

type AdminEvent = {
	id: string;
	title: string;
	status:
		| "pending"
		| "paid"
		| "active"
		| "overdue"
		| "completed"
		| "cancelled"
		| "expired"
		| "maintenance"
		| "blocked";
	timeRange: string; // local time (Europe/Tallinn)
	conflict?: boolean;
};

const events: AdminEvent[] = [
	{
		id: "e1",
		title: "Makita akutrell",
		status: "paid",
		timeRange: "10:00–12:00",
	},
	{
		id: "e2",
		title: "Bosch ketaslõikur",
		status: "active",
		timeRange: "11:00–15:00",
		conflict: true,
	},
	{
		id: "e3",
		title: "DeWalt tolmuimeja",
		status: "overdue",
		timeRange: "09:00–(tagastus hilineb)",
	},
	{
		id: "e4",
		title: "Kapihooldus",
		status: "maintenance",
		timeRange: "16:00–18:00",
	},
	{
		id: "e5",
		title: "Manuaalne blokk",
		status: "blocked",
		timeRange: "18:00–19:00",
	},
];

export function AdminTimelineExample() {
	return (
		<div style={{ display: "grid", gap: 12, maxWidth: 520 }}>
			<Legend label="Legend" />
			<div style={{ display: "grid", gap: 8 }}>
				{events.map((e) => (
					<EventBlock
						key={e.id}
						status={e.status}
						title={e.title}
						meta={<span>{e.timeRange}</span>}
						showConflict={Boolean(e.conflict)}
						tooltip={e.conflict ? "Ajakatte konflikt: kontrolli kattuvaid broneeringuid" : undefined}
					/>
				))}
			</div>
		</div>
	);
}

