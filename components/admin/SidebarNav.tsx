"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
	LayoutDashboard,
	CalendarDays,
	Package,
	Tags,
	Lock,
	Grid3X3,
	Users,
	Settings,
	ScrollText,
} from "lucide-react";

import { cn } from "@/lib/utils";

type NavItem = {
	href: string;
	label: string;
	icon: React.ComponentType<{ className?: string }>;
};

const nav: NavItem[] = [
	{ href: "/admin", label: "Dashboard", icon: LayoutDashboard },
	{ href: "/admin/bookings", label: "Bookings", icon: CalendarDays },
	{ href: "/admin/products", label: "Products", icon: Package },
	{ href: "/admin/categories", label: "Categories", icon: Tags },
	{ href: "/admin/lockers", label: "Lockers", icon: Lock },
	{ href: "/admin/compartments", label: "Compartments", icon: Grid3X3 },
	{ href: "/admin/users", label: "Users & Roles", icon: Users },
	{ href: "/admin/settings", label: "Settings", icon: Settings },
	{ href: "/admin/audit", label: "Audit Log", icon: ScrollText },
];

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
	const pathname = usePathname();

	return (
		<nav className="flex flex-col gap-1">
			{nav.map((item) => {
				const active =
					item.href === "/admin"
						? pathname === "/admin"
						: pathname?.startsWith(item.href);
				const Icon = item.icon;
				return (
					<Link
						key={item.href}
						href={item.href}
						onClick={onNavigate}
						className={cn(
							"group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
							active
								? "bg-[hsl(var(--accent))] text-[var(--rb-text)]"
								: "text-[var(--rb-muted)] hover:bg-[hsl(var(--accent))] hover:text-[var(--rb-text)]",
						)}
					>
						<Icon className={cn("h-4 w-4", active ? "text-[var(--rb-primary)]" : "")} />
						<span className="truncate">{item.label}</span>
					</Link>
				);
			})}
		</nav>
	);
}

