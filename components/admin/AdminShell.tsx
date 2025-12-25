import { SidebarNav } from './SidebarNav';

export function AdminShell({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex h-screen overflow-hidden">
			{/* Sidebar */}
			<aside className="hidden w-64 border-r bg-card md:block">
				<div className="flex h-16 items-center border-b px-6">
					<h1 className="text-xl font-bold">Rentbox Admin</h1>
				</div>
				<SidebarNav />
			</aside>

			{/* Main content */}
			<main className="flex-1 overflow-y-auto">
				<div className="container mx-auto p-6">{children}</div>
			</main>
		</div>
	);
}
