"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { SidebarNav } from "./SidebarNav";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/types";
import { logoutAction } from "@/app/actions/auth";
import { toast } from "sonner";

interface AdminShellProps {
  children: React.ReactNode;
  user: SessionUser;
}

export function AdminShell({ children, user }: AdminShellProps) {
  const router = useRouter();
  const [isCollapsed] = React.useState(false);

  const handleLogout = async () => {
    try {
      await logoutAction();
      router.push("/login");
      toast.success("Logged out successfully");
    } catch {
      toast.error("Failed to log out");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SidebarNav userRole={user.role} onLogout={handleLogout} />

      <main
        className={cn(
          "min-h-screen transition-all duration-300 pb-20 lg:pb-0",
          isCollapsed ? "lg:pl-16" : "lg:pl-64"
        )}
      >
        <div className="container mx-auto p-4 lg:p-6">
          {/* User info header */}
          <div className="mb-6 flex items-center justify-between border-b pb-4">
            <div className="pl-12 lg:pl-0">
              <h2 className="text-sm font-medium text-muted-foreground">
                Welcome back,
              </h2>
              <p className="text-lg font-semibold">{user.name}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium capitalize text-primary">
                {user.role}
              </span>
            </div>
          </div>

          {children}
        </div>
      </main>
    </div>
  );
}
