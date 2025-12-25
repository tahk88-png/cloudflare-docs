import { NextRequest, NextResponse } from 'next/server';
import { runOwnerAgent } from '@/lib/agents/owner';

export async function POST(req: NextRequest) {
    try {
        const { query } = await req.json();
        const response = await runOwnerAgent(query);
        return NextResponse.json({ response });
    } catch (e) {
        return NextResponse.json({ error: 'Error' }, { status: 500 });
    }
}
