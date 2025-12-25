import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsClient } from "@/components/admin/settings/SettingsClient";
import { getSettings } from "@/lib/admin/settings";

export default async function AdminSettingsPage() {
	const settings = await getSettings();

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-xl font-semibold">Settings</h1>
				<p className="mt-1 text-sm text-[var(--rb-muted)]">
					Business defaults and operational settings (timezone locked to Europe/Tallinn).
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Business settings</CardTitle>
				</CardHeader>
				<CardContent>
					<SettingsClient
						initial={{
							defaultSlotMinutes: settings.defaultSlotMinutes,
							defaultMinRentalMinutes: settings.defaultMinRentalMinutes,
							timezone: settings.timezone as any,
							contactEmail: settings.contactEmail,
							contactPhone: settings.contactPhone,
						}}
					/>
				</CardContent>
			</Card>
		</div>
	);
}

