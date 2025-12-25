import { Metadata } from 'next';

export const metadata: Metadata = {
	title: 'Tööriistad 24/7 | Rentbox',
	description: 'Professionaalsed tööriistad. Kohene kättesaamine.',
	openGraph: {
		title: 'Tööriistad 24/7 | Rentbox',
		description: 'Professionaalsed tööriistad. Kohene kättesaamine.',
		type: 'website',
	},
};

export default function ToolsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <>{children}</>;
}
