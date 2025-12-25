import { prisma } from '@/lib/db/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SettingsForm } from '@/components/admin/settings/SettingsForm';

async function getSettings() {
  const settings = await prisma.settings.findMany();
  return settings.reduce((acc, setting) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {} as Record<string, string>);
}

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure system-wide settings
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Business Settings</CardTitle>
            <CardDescription>
              Configure default rental parameters and business information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SettingsForm settings={settings} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
            <CardDescription>
              Current system configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Default Timezone:</span>
              <span className="font-medium">{settings.default_timezone || 'Europe/Tallinn'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Contact Email:</span>
              <span className="font-medium">{settings.contact_email || 'info@rentbox.ee'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Default Slot Duration:</span>
              <span className="font-medium">{settings.default_slot_minutes || '15'} minutes</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Min Rental Duration:</span>
              <span className="font-medium">{settings.default_min_rental_minutes || '60'} minutes</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
