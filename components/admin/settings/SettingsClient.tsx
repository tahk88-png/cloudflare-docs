"use client";

import { updateSettingsAction } from "@/lib/admin/settings.actions";
import { SettingsForm, type SettingsFormValues } from "@/components/admin/forms/SettingsForm";

export function SettingsClient({ initial }: { initial: SettingsFormValues }) {
	return (
		<SettingsForm
			initial={initial}
			onSubmit={async (v) => {
				await updateSettingsAction({
					defaultSlotMinutes: v.defaultSlotMinutes,
					defaultMinRentalMinutes: v.defaultMinRentalMinutes,
					timezone: v.timezone,
					contactEmail: v.contactEmail ?? null,
					contactPhone: v.contactPhone ?? null,
				} as any);
				window.location.reload();
			}}
		/>
	);
}

