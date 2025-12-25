import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default async function SettingsPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold">Settings</h1>
				<p className="text-muted-foreground">Manage system settings</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Business Settings</CardTitle>
					<CardDescription>Configure default rental settings</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="defaultSlotMinutes">Default Slot Minutes</Label>
						<Input id="defaultSlotMinutes" type="number" defaultValue={15} />
						<p className="text-sm text-muted-foreground">
							Default time slot duration for bookings
						</p>
					</div>

					<div className="space-y-2">
						<Label htmlFor="defaultMinRentalMinutes">Default Min Rental Minutes</Label>
						<Input id="defaultMinRentalMinutes" type="number" defaultValue={60} />
						<p className="text-sm text-muted-foreground">
							Minimum rental duration for new products
						</p>
					</div>

					<div className="space-y-2">
						<Label htmlFor="timezone">Timezone</Label>
						<Input id="timezone" defaultValue="Europe/Tallinn" disabled />
						<p className="text-sm text-muted-foreground">System timezone (locked)</p>
					</div>

					<Button>Save Changes</Button>
				</CardContent>
			</Card>
		</div>
	);
}
