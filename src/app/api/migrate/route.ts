import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET() {
    try {
        const pool = await getPool();

        // Ensure robot_image_url on pit table
        await pool.request().query(`
            IF NOT EXISTS (
                SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME='frc6377TeamScoutingPrivate' AND COLUMN_NAME='robot_image_url'
            )
            ALTER TABLE frc6377TeamScoutingPrivate ADD robot_image_url varchar(max) NULL
        `);

        // Ensure other_notes on pit table
        await pool.request().query(`
            IF NOT EXISTS (
                SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME='frc6377TeamScoutingPrivate' AND COLUMN_NAME='other_notes'
            )
            ALTER TABLE frc6377TeamScoutingPrivate ADD other_notes NVARCHAR(MAX) NULL
        `);


        return NextResponse.json({ ok: true, message: 'All columns ensured' });
    } catch (e) {
        return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
    }
}

