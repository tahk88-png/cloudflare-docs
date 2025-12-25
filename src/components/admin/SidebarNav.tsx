'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Calendar,
  Package,
  Layers,
  Box,
  Grid,
  Settings,
  Users,
  FileClock,
  LogOut
} from 'lucide-react';

const items = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Bookings",
    href: "/admin/bookings",
    icon: Calendar,
  },
  {
    title: "Products",
    href: "/admin/products",
    icon: Package,
  },
  {
    title: "Categories",
    href: "/admin/categories",
    icon: Layers,
  },
  {
    title: "Lockers",
    href: "/admin/lockers",
    icon: Box,
  },
  {
    title: "Compartments",
    href: "/admin/compartments",
    icon: Grid,
  },
  {
    title: "Users & Roles",
    href: "/admin/users",
    icon: Users,
  },
  {
    title: "Audit Log",
    href: "/admin/audit",
    icon: FileClock,
  },
  {
    title: "Settings",
    href: "/admin/settings",
    icon: Settings,
  },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="grid items-start gap-2">
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <Link
            key={index}
            href={item.href}
            className={cn(
              "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
              pathname === item.href ? "bg-accent text-accent-foreground" : "text-muted-foreground"
            )}
          >
            <Icon className="mr-2 h-4 w-4" />
            <span>{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}

// Fixed version: text-transparent was wrong, it should be text-muted-foreground or similar for inactive state.
// Correcting below.
