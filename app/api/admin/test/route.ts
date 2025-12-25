import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/requireRole';

export async function GET() {
	try {
		const user = await requireAuth();
		return NextResponse.json({ 
			success: true, 
			user: {
				id: user.id,
				email: user.email,
				role: user.role,
			},
		});
	} catch (error) {
		return NextResponse.json(
			{ success: false, error: 'Unauthorized' },
			{ status: 401 },
		);
	}
}
