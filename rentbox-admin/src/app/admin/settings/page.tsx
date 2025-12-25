import { requirePermission } from "@/lib/auth/requireRole";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Settings, Clock, Globe, Mail } from "lucide-react";

export default async function SettingsPage() {
  await requirePermission("MANAGE_SETTINGS");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure system-wide settings
        </p>
      </div>

      <div className="grid gap-6">
        {/* Business Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Business Settings
            </CardTitle>
            <CardDescription>
              Default rental configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Default Slot Duration</p>
                <p className="font-medium">15 minutes</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Minimum Rental Duration</p>
                <p className="font-medium">60 minutes</p>
              </div>
            </div>
            <Separator />
            <p className="text-sm text-muted-foreground">
              These settings can be overridden per-product in the product configuration.
            </p>
          </CardContent>
        </Card>

        {/* Timezone Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Regional Settings
            </CardTitle>
            <CardDescription>
              Timezone and localization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">System Timezone</p>
                <p className="font-medium">Europe/Tallinn</p>
              </div>
              <Badge variant="outline">
                <Clock className="mr-1 h-3 w-3" />
                UTC+2/+3
              </Badge>
            </div>
            <Separator />
            <p className="text-sm text-muted-foreground">
              All bookings are stored in UTC and displayed in the local timezone.
              This setting is locked to Europe/Tallinn for consistency.
            </p>
          </CardContent>
        </Card>

        {/* Contact Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Contact Information
            </CardTitle>
            <CardDescription>
              Business contact details for receipts and notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Support Email</p>
                <p className="font-medium">support@rentbox.ee</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Support Phone</p>
                <p className="font-medium">+372 5XX XXXX</p>
              </div>
            </div>
            <Separator />
            <p className="text-sm text-muted-foreground">
              Contact information displayed on customer receipts and notifications.
            </p>
          </CardContent>
        </Card>

        {/* System Info */}
        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
            <CardDescription>
              Technical details about the admin panel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Version</p>
                <p className="font-medium">1.0.0</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Environment</p>
                <Badge variant="outline">
                  {process.env.NODE_ENV || "development"}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Database</p>
                <Badge variant="outline">PostgreSQL</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
