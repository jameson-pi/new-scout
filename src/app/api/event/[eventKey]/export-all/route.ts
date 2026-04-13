import { NextResponse } from 'next/server';
import { buildEventExportBundle } from '@/lib/exportBundle';

function isValidEventKey(eventKey: string): boolean {
    return /^[a-z0-9]{4,20}$/i.test(eventKey);
}

export async function GET(
    _: Request,
    { params }: { params: Promise<{ eventKey: string }> }
) {
    try {
        const { eventKey } = await params;
        if (!isValidEventKey(eventKey)) {
            return NextResponse.json({ error: 'Invalid event key.' }, { status: 400 });
        }

        const bundle = await buildEventExportBundle(eventKey);
        const filename = `${eventKey}_full_export_${new Date().toISOString().slice(0, 10)}.json`;

        return new NextResponse(JSON.stringify(bundle, null, 2), {
            status: 200,
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        console.error('[Export API] Failed to build export bundle:', error);
        return NextResponse.json({ error: 'Failed to build export bundle.' }, { status: 500 });
    }
}

