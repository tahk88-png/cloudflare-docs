import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const { query_key } = await req.json();
        
        let result: any = null;
        let summary = "";

        if (query_key === 'TOP_RISKS_TODAY') {
            result = await prisma.booking.findMany({
                where: { 
                    status: { not: 'COMPLETED' },
                    riskScore: { gt: 50 }
                },
                orderBy: { riskScore: 'desc' },
                take: 5,
                include: { user: true, product: true }
            });
            summary = `Found ${result.length} high risk active bookings.`;
        }
        else if (query_key === 'OVERDUE_NOW') {
            result = await prisma.booking.findMany({
                where: { status: 'OVERDUE' },
                include: { user: true, product: true }
            });
            summary = `There are ${result.length} overdue bookings right now.`;
        }
        else if (query_key === 'OPEN_FAILED_TODAY') {
             // Mock query for failed events
             const failures = await prisma.event.count({
                 where: { 
                     type: 'locker.opened', 
                     status: 'failed',
                     createdAt: { gte: new Date(new Date().setHours(0,0,0,0)) }
                 }
             });
             result = { count: failures };
             summary = `${failures} locker open failures today.`;
        }
        else if (query_key === 'UNDERPERFORMING_PRODUCTS_ROI') {
            // Mock
            summary = "Pressure Washer K7 is at 10% utilization. Recommendation: Lower price or check condition.";
        }
        else {
            summary = "Query not recognized.";
        }

        return NextResponse.json({ summary, data: result });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Error' }, { status: 500 });
    }
}
