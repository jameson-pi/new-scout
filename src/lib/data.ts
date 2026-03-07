import { ScoutReport, RebuiltData } from './spr';
import { getEventMatches } from './tba';
import { getPool, sql } from './db';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function parseTowerLevel(val: string | null | undefined, isAuto: boolean): string {
    if (!val) return 'None';
    if (val.includes('Level3') && !isAuto) return 'Level3';
    if (val.includes('Level2') && !isAuto) return 'Level2';
    if (val.includes('Level1')) return 'Level1';
    return 'None';
}

function parseHubControl(val: string | null | undefined): 'Dominant' | 'Average' | 'Weak' | undefined {
    if (val === 'Dominant') return 'Dominant';
    if (val === 'Weak') return 'Weak';
    if (val === 'Average') return 'Average';
    return undefined;
}

function rowToScoutReport(row: any): ScoutReport {
    const driverStation: string = row.driver_station ?? '';
    const alliance = driverStation.startsWith('red') ? 'red' : 'blue';

    const data: RebuiltData = {
        auto: {
            fuel_scored: Number(row.auto_fuel_scored) || 0,
            tower_level: parseTowerLevel(row.auto_tower_level, true) as 'None' | 'Level1',
            moved: row.auto_moved === true || row.auto_moved === 1,
        },
        teleop: {
            fuel_scored: Number(row.tele_fuel_scored) || 0,
            tower_level: parseTowerLevel(row.tele_tower_level, false) as 'None' | 'Level1' | 'Level2' | 'Level3',
        },
        notes: row.other_notes || '',
        mech_failure: row.mech_failure === true || row.mech_failure === 1,
        defender_rating: Number(row.defender_rating) || 0,
        hub_control: parseHubControl(row.hub_control),
        trench_capable: row.trench_capable === true || row.trench_capable === 1,
    };

    return {
        scoutId: row.scouted_by ?? '',
        matchKey: row.match_key ?? '',
        teamKey: `frc${row.frc_team}`,
        alliance: alliance as 'red' | 'blue',
        data,
    };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Load all scouting reports for a given event from Azure SQL.
 * REBUILT 2026 Edition
 */
export async function loadEventReports(eventKey: string): Promise<ScoutReport[]> {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('eventKey', sql.NVarChar(20), eventKey)
            .query(`
                SELECT
                    frc_team, match_key, driver_station, scouted_by,
                    auto_fuel_scored, auto_tower_level, auto_moved,
                    tele_fuel_scored, tele_tower_level, other_notes,
                    mech_failure, defender_rating, trench_capable, hub_control
                FROM ScoutReports
                WHERE event_key = @eventKey
                ORDER BY match_number ASC, frc_team ASC
            `);

        return result.recordset.map(rowToScoutReport);
    } catch (e) {
        console.error(`[DB] Error loading reports for ${eventKey}:`, e);
        return [];
    }
}

/**
 * Unified getter for Simulation, SPR, and Dashboard
 */
export async function getMissionData(eventKey: string = '2026txcle') {
    const [reports, tbaMatchesRaw] = await Promise.all([
        loadEventReports(eventKey),
        getEventMatches(eventKey),
    ]);

    const tbaMatches: Record<string, any> = {};
    tbaMatchesRaw.forEach((m: any) => {
        tbaMatches[m.key] = {
            matchKey: m.key,
            alliances: {
                red: {
                    score: m.alliances.red.score,
                    autoPoints: m.score_breakdown?.red?.autoPoints || 0,
                    teleopPoints: m.score_breakdown?.red?.teleopPoints || 0,
                    endgamePoints: m.score_breakdown?.red?.endgamePoints || 0,
                },
                blue: {
                    score: m.alliances.blue.score,
                    autoPoints: m.score_breakdown?.blue?.autoPoints || 0,
                    teleopPoints: m.score_breakdown?.blue?.teleopPoints || 0,
                    endgamePoints: m.score_breakdown?.blue?.endgamePoints || 0,
                },
            },
        };
    });

    return { reports, tbaMatches, tbaMatchesRaw };
}

export async function getEventSchedule(eventKey: string = '2026txcle') {
    const tbaMatchesRaw = await getEventMatches(eventKey);
    return tbaMatchesRaw
        .filter((m: any) => m.comp_level === 'qm')
        .map((m: any) => ({
            key: m.key,
            matchNumber: m.match_number,
            red: m.alliances.red.team_keys,
            blue: m.alliances.blue.team_keys,
        }))
        .sort((a: any, b: any) => a.matchNumber - b.matchNumber);
}

export async function getUniqueScouters(eventKey: string = '2026txcle'): Promise<string[]> {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('eventKey', sql.NVarChar(20), eventKey)
            .query(`
                SELECT DISTINCT scouted_by
                FROM ScoutReports
                WHERE event_key = @eventKey
                  AND scouted_by IS NOT NULL
                  AND scouted_by <> ''
                ORDER BY scouted_by ASC
            `);
        return result.recordset.map((r: any) => r.scouted_by as string);
    } catch (e) {
        console.error(`[DB] Error loading scouters for ${eventKey}:`, e);
        return [];
    }
}

/**
 * Returns all known events from the Events table in Azure SQL.
 */
export async function getAvailableEvents(): Promise<{ key: string; name: string; location: string }[]> {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT event_key, name, location
            FROM Events
            ORDER BY event_key DESC
        `);
        return result.recordset.map((r: any) => ({
            key: r.event_key as string,
            name: r.name as string,
            location: r.location as string,
        }));
    } catch (e) {
        console.error('[DB] Error loading available events:', e);
        // Fallback to known events if DB is unavailable
        return [
            { key: '2026howdy',  name: 'HowdyScout Practice', location: 'Houston, TX' },
            { key: '2026txcle',  name: 'Space City #1',        location: 'Houston, TX' },
            { key: '2026txman',  name: 'Manor District',        location: 'Manor, TX' },
        ];
    }
}
