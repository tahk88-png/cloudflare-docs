import Link from "next/link";
import { Menu } from "lucide-react";

import { SidebarNav } from "@/components/admin/SidebarNav";
import { UserMenu } from "@/components/admin/UserMenu";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

export function AdminShell({
	children,
	user,
}: {
	children: React.ReactNode;
	user: { name?: string | null; email?: string | null; role: string };
}) {
	return (
		<div className="min-h-dvh bg-[var(--rb-bg)] text-[var(--rb-text)]">
			<div className="mx-auto flex min-h-dvh w-full max-w-[1600px]">
				<aside className="hidden w-64 shrink-0 border-r border-[var(--rb-border)] bg-[var(--rb-card)] p-4 md:block">
					<div className="mb-4">
						<Link href="/admin" className="block rounded-xl px-2 py-2">
							<div className="text-sm font-semibold tracking-wide">
								Rentbox <span className="text-[var(--rb-primary)]">Admin</span>
							</div>
							<div className="text-xs text-[var(--rb-muted)]">Operations Console</div>
						</Link>
					</div>
					<SidebarNav />
				</aside>

				<div className="flex min-w-0 flex-1 flex-col">
					<header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-[var(--rb-border)] bg-[var(--rb-bg)]/90 px-4 backdrop-blur md:px-6">
						<Sheet>
							<SheetTrigger asChild>
								<Button variant="outline" size="icon" className="md:hidden">
									<Menu className="h-4 w-4" />
									<span className="sr-only">Open navigation</span>
								</Button>
							</SheetTrigger>
							<SheetContent side="left" className="p-0">
								<SheetHeader className="p-4">
									<SheetTitle>
										Rentbox <span className="text-[var(--rb-primary)]">Admin</span>
									</SheetTitle>
								</SheetHeader>
								<Separator />
								<div className="p-4">
									<SidebarNav onNavigate={() => {}} />
								</div>
							</SheetContent>
						</Sheet>

						<div className="flex-1" />
						<UserMenu name={user.name} email={user.email} role={user.role} />
					</header>

					<main className="flex-1 p-4 md:p-6">{children}</main>
				</div>
			</div>
		</div>
	);
}

