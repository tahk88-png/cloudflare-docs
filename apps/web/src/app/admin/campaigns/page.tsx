"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminCampaignsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Campaigns</h1>
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Campaign management (demo)</p>
        </CardContent>
      </Card>
    </div>
  );
}
