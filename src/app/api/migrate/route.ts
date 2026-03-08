import { NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';

export async function GET() {
    try {
        const pool = await getPool();
        await pool.request().query(`
            IF NOT EXISTS (
                SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME='frc6377TeamScoutingPrivate' AND COLUMN_NAME='robot_image_url'
            )
            ALTER TABLE frc6377TeamScoutingPrivate ADD robot_image_url varchar(max) NULL
        `);
        return NextResponse.json({ ok: true, message: 'robot_image_url column ensured' });
    } catch (e) {
        return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
    }
}

