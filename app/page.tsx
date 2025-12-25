import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { Metadata } from 'next';

export const metadata: Metadata = {
	title: 'Rentbox | Tööriistad 24/7',
	description: 'Professionaalsed tööriistad. Kohene kättesaamine.',
};

export default function HomePage() {
	return (
		<div className="flex min-h-screen flex-col">
			{/* Hero */}
			<section className="flex flex-1 items-center justify-center bg-background px-4 py-16">
				<div className="mx-auto max-w-4xl text-center">
					<h1 className="mb-6 text-5xl font-bold tracking-tight md:text-6xl">
						Tööriistad 24/7
					</h1>
					<p className="mb-8 text-xl text-muted-foreground md:text-2xl">
						Professionaalsed tööriistad. Kohene kättesaamine.
					</p>
					<p className="mb-8 text-lg text-muted-foreground">
						Rendi. Tee töö ära. Tagasta.
					</p>
					<Button asChild size="lg" className="text-lg">
						<Link href="/tooriistad">
							Vaata tööriistu
							<ArrowRight className="ml-2 h-5 w-5" />
						</Link>
					</Button>
				</div>
			</section>
		</div>
	);
}
