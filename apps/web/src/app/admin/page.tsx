"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export default function AdminPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("admin_token");
    if (stored) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = () => {
    if (token) {
      localStorage.setItem("admin_token", token);
      setIsAuthenticated(true);
    }
  };

  if (!isAuthenticated) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Admin Login</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Input
              type="password"
              placeholder="Admin Token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <Button onClick={handleLogin} className="w-full">
              Login
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/admin/bookings">
          <Card className="cursor-pointer hover:bg-accent">
            <CardHeader>
              <CardTitle>Bookings</CardTitle>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/admin/incidents">
          <Card className="cursor-pointer hover:bg-accent">
            <CardHeader>
              <CardTitle>Incidents</CardTitle>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/admin/calendar">
          <Card className="cursor-pointer hover:bg-accent">
            <CardHeader>
              <CardTitle>Calendar</CardTitle>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/admin/discounts">
          <Card className="cursor-pointer hover:bg-accent">
            <CardHeader>
              <CardTitle>Discount Codes</CardTitle>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/admin/vouchers">
          <Card className="cursor-pointer hover:bg-accent">
            <CardHeader>
              <CardTitle>Vouchers</CardTitle>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/admin/campaigns">
          <Card className="cursor-pointer hover:bg-accent">
            <CardHeader>
              <CardTitle>Campaigns</CardTitle>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/admin/system">
          <Card className="cursor-pointer hover:bg-accent">
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
