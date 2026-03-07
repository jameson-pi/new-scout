'use server';

import { getPool, sql } from './db';
import { generateMatchStrategy } from './ai';

export async function saveScoutReport(report: any) {
    try {
        const pool = await getPool();

        // REBUILT 2026 scoring constants
        const TELE_TOWER: Record<string, number> = { Level1: 10, Level2: 20, Level3: 30, None: 0 };
        const AUTO_TOWER: Record<string, number> = { Level1: 15, None: 0 };

        const autoFuel: number = Number(report.auto?.fuel ?? report.auto?.fuel_scored ?? 0);
        const teleFuel: number = Number(report.tele?.fuel ?? report.tele?.fuel_scored ?? 0);
        const autoTowerLevel: string = report.auto?.towerLevel || report.auto?.tower_level || 'None';
        const teleTowerLevel: string = report.tele?.towerLevel || report.tele?.tower_level || 'None';
        const autoMoved: boolean = Boolean(report.auto?.moved);

        const totalAuto = autoFuel + (AUTO_TOWER[autoTowerLevel] || 0) + (autoMoved ? 3 : 0);
        const totalTele = teleFuel + (TELE_TOWER[teleTowerLevel] || 0);
        const teleBetter = totalTele > totalAuto ? 1 : 0;

        const teamNum = parseInt(String(report.team).replace('frc', ''), 10);
        const eventKey: string = report.eventKey || '2026txcle';
        const matchKey: string = report.match || '';
        const matchNumber = parseInt(matchKey.split('_qm').pop() || '0', 10);
        const primaryKey = `${teamNum}-${matchKey}-scout-${report.scouter}`;
        const driverStation: string = report.driver_station || 'scout';

        await pool.request()
            .input('primary_key',        sql.NVarChar(100),  primaryKey)
            .input('frc_team',           sql.Int,            teamNum)
            .input('event_key',          sql.NVarChar(20),   eventKey)
            .input('match_key',          sql.NVarChar(50),   matchKey)
            .input('driver_station',     sql.NVarChar(10),   driverStation)
            .input('comp_level',         sql.NVarChar(5),    'qm')
            .input('match_number',       sql.Int,            matchNumber)
            .input('auto_moved',         sql.Bit,            autoMoved ? 1 : 0)
            .input('auto_fuel_scored',   sql.Int,            autoFuel)
            .input('auto_tower_level',   sql.NVarChar(10),   autoTowerLevel)
            .input('tele_fuel_scored',   sql.Int,            teleFuel)
            .input('tele_tower_level',   sql.NVarChar(10),   teleTowerLevel)
            .input('auto_total',         sql.Int,            totalAuto)
            .input('tele_total',         sql.Int,            totalTele)
            .input('tele_better',        sql.Bit,            teleBetter)
            .input('hub_control',        sql.NVarChar(15),   report.hub_control || 'Average')
            .input('trench_capable',     sql.Bit,            report.trench_capable ? 1 : 0)
            .input('defender_rating',    sql.Int,            report.defender_rating || 3)
            .input('mech_failure',       sql.Bit,            report.mech_failure ? 1 : 0)
            .input('other_notes',        sql.NVarChar(sql.MAX), report.notes || '')
            .input('scouted_by',         sql.NVarChar(100),  report.scouter || 'Unknown')
            .query(`
                MERGE ScoutReports AS target
                USING (SELECT @primary_key AS primary_key) AS source ON target.primary_key = source.primary_key
                WHEN NOT MATCHED THEN
                    INSERT (
                        primary_key, frc_team, event_key, match_key, driver_station,
                        comp_level, match_number, auto_moved, auto_fuel_scored, auto_tower_level,
                        tele_fuel_scored, tele_tower_level, auto_total, tele_total, tele_better,
                        hub_control, trench_capable, defender_rating, mech_failure, other_notes, scouted_by
                    )
                    VALUES (
                        @primary_key, @frc_team, @event_key, @match_key, @driver_station,
                        @comp_level, @match_number, @auto_moved, @auto_fuel_scored, @auto_tower_level,
                        @tele_fuel_scored, @tele_tower_level, @auto_total, @tele_total, @tele_better,
                        @hub_control, @trench_capable, @defender_rating, @mech_failure, @other_notes, @scouted_by
                    )
                WHEN MATCHED THEN
                    UPDATE SET
                        auto_moved = @auto_moved, auto_fuel_scored = @auto_fuel_scored,
                        auto_tower_level = @auto_tower_level, tele_fuel_scored = @tele_fuel_scored,
                        tele_tower_level = @tele_tower_level, auto_total = @auto_total,
                        tele_total = @tele_total, tele_better = @tele_better,
                        hub_control = @hub_control, trench_capable = @trench_capable,
                        defender_rating = @defender_rating, mech_failure = @mech_failure,
                        other_notes = @other_notes, scouted_by = @scouted_by;
            `);

        return { success: true };
    } catch (e) {
        console.error('[DB] Failed to save report:', e);
        return { success: false, error: String(e) };
    }
}

export async function getTacticalStrategy(matchKey: string, alliance: 'red' | 'blue', allianceData: any[], opponentData: any[]) {
    try {
        return await generateMatchStrategy(matchKey, alliance, allianceData, opponentData);
    } catch (e) {
        console.error('Tactical strategy error:', e);
        return 'Tactical link severed.';
    }
}
