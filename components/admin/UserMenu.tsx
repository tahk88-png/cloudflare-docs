"use client";

import { signOut } from "next-auth/react";
import { LogOut, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu({
	name,
	email,
	role,
}: {
	name?: string | null;
	email?: string | null;
	role: string;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="sm" className="gap-2">
					<User className="h-4 w-4" />
					<span className="hidden sm:inline">{name ?? email ?? "User"}</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				<DropdownMenuLabel>
					<div className="flex flex-col">
						<span className="text-sm font-medium">{name ?? "Admin"}</span>
						<span className="text-xs font-normal text-[var(--rb-muted)]">
							{email ?? ""}
						</span>
						<span className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--rb-muted)]">
							{role}
						</span>
					</div>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					onSelect={(e) => {
						e.preventDefault();
						void signOut({ callbackUrl: "/admin/login" });
					}}
					className="gap-2"
				>
					<LogOut className="h-4 w-4" />
					Sign out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

