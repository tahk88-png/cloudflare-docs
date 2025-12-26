"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@shared/api";
import { Incident } from "@shared/types";
import { format } from "date-fns";

export default function AdminIncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (token) {
      api.getAdminIncidents(token).then(setIncidents).finally(() => setLoading(false));
    }
  }, []);

  const handleResolve = async (id: string) => {
    const token = localStorage.getItem("admin_token");
    if (token) {
      await api.resolveIncident(id, token);
      setIncidents(incidents.map(i => i.id === id ? { ...i, status: "RESOLVED" as any } : i));
    }
  };

  const severityColors: Record<string, "default" | "secondary" | "destructive"> = {
    LOW: "secondary",
    MEDIUM: "default",
    HIGH: "destructive",
    CRITICAL: "destructive",
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Incidents</h1>
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <div className="space-y-4">
          {incidents.map((incident) => (
            <Card key={incident.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{incident.title}</CardTitle>
                    <div className="flex gap-2 mt-2">
                      <Badge variant={severityColors[incident.severity] || "default"}>
                        {incident.severity}
                      </Badge>
                      <Badge variant={incident.status === "RESOLVED" ? "secondary" : "destructive"}>
                        {incident.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {incident.notes && <p className="text-sm mb-4">{incident.notes}</p>}
                <p className="text-xs text-muted-foreground">
                  Created: {format(new Date(incident.createdAt), "PPp")}
                </p>
                {incident.status !== "RESOLVED" && (
                  <Button
                    className="mt-4"
                    onClick={() => handleResolve(incident.id)}
                  >
                    Mark as Resolved
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
