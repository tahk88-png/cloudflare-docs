import { createBookingAction } from '../booking';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
	try {
		const formData = await request.formData();
		const result = await createBookingAction(formData);

		if (result.success) {
			return NextResponse.json(result);
		} else {
			return NextResponse.json(result, { status: 400 });
		}
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Server error',
			},
			{ status: 500 },
		);
	}
}
