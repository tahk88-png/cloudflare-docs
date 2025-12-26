"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@shared/api";

export default function AdminSystemPage() {
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getFlags(), api.getHealth()]).then(([f, h]) => {
      setFlags(f);
      setHealth(h);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">System Settings</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>System Flags</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <div className="space-y-2">
                {Object.entries(flags).map(([key, enabled]) => (
                  <div key={key} className="flex justify-between items-center">
                    <span className="text-sm">{key}</span>
                    <Badge variant={enabled ? "default" : "secondary"}>
                      {enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Health Status</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-32 w-full" />
            ) : health ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Overall</span>
                  <Badge variant={health.overall === "ok" ? "default" : "destructive"}>
                    {health.overall}
                  </Badge>
                </div>
                {Object.entries(health.services || {}).map(([service, status]) => (
                  <div key={service} className="flex justify-between items-center">
                    <span className="text-sm">{service}</span>
                    <Badge variant={status === "ok" ? "default" : status === "down" ? "destructive" : "secondary"}>
                      {status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
