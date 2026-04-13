import { ScoutReport, RebuiltData } from './spr';
import { getEventMatches } from './tba';
import { getPool, sql } from './db';

// Simple in-memory cache for query results (1 minute TTL in production)
const queryCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute

function getCacheKey(...args: any[]): string {
    return args.map(arg => String(arg)).join(':');
}

function getCached<T>(key: string): T | null {
    const entry = queryCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL) {
        queryCache.delete(key);
        return null;
    }
    return entry.data as T;
}

function setCached<T>(key: string, data: T): T {
    queryCache.set(key, { data, timestamp: Date.now() });
    return data;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function parseClimbLevel(val: string | null | undefined, isAuto: boolean): string {
    if (!val) return 'No Attempt';
    const v = val.trim();
    if (v.includes('Level3') && !isAuto) return 'Level3';
    if (v.includes('Level2') && !isAuto) return 'Level2';
    if (v.includes('Level1')) return 'Level1';
    return 'No Attempt';
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
            climb_level: parseClimbLevel(row.auto_climb_level, true) as 'No Attempt' | 'Level1',
            moved: row.auto_moved === 'Yes' || row.auto_moved === true || row.auto_moved === 1
                || (Number(row.auto_fuel_scored) || 0) > 0,
        },
        teleop: {
            fuel_scored: Number(row.tele_fuel_scored) || 0,
            climb_level: parseClimbLevel(row.tele_climb_level, false) as 'No Attempt' | 'Level1' | 'Level2' | 'Level3',
        },
        notes: row.other_notes || '',
        mech_failure: row.mech_failure === 'Yes' || row.mech_failure === true || row.mech_failure === 1,
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
 * Uses the real frc6377MatchScouting table.
 */
export async function loadEventReports(eventKey: string): Promise<ScoutReport[]> {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('eventKey', sql.NVarChar(20), eventKey)
            .query(`
                SELECT
                    m.frc_team, m.match_key, m.driver_station, m.scouted_by,
                    m.auto_fuel_scored, m.auto_climb_level, m.auto_moved,
                    m.tele_fuel_scored, m.tele_climb_level,
                    m.mech_failure, m.defender_rating,
                    ISNULL(p.other_notes, '') AS other_notes,
                    NULL AS hub_control,
                    0    AS trench_capable
                FROM frc6377MatchScouting m
                LEFT JOIN frc6377MatchScoutingPrivate p
                    ON p.match_key      = m.match_key
                   AND p.frc_team       = m.frc_team
                   AND p.driver_station = m.driver_station
                   AND p.scouted_by     = m.scouted_by
                WHERE LOWER(m.event_key) = LOWER(@eventKey)
                ORDER BY m.match_number ASC, m.frc_team ASC
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
export async function getMissionData(eventKey: string = '2026txcle'): Promise<{ reports: ScoutReport[], tbaMatches: Record<string, any>, tbaMatchesRaw: any[] }> {
    const cacheKey = getCacheKey('mission', eventKey);
    const cached = getCached<{ reports: ScoutReport[], tbaMatches: Record<string, any>, tbaMatchesRaw: any[] }>(cacheKey);
    if (cached) return cached;

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

    return setCached<{ reports: ScoutReport[], tbaMatches: Record<string, any>, tbaMatchesRaw: any[] }>(cacheKey, { reports, tbaMatches, tbaMatchesRaw });
}

export async function getEventSchedule(eventKey: string = '2026txcle') {
    // Try DB-stored schedule first (EventMatches table)
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('eventKey', sql.NVarChar(20), eventKey)
            .query(`
                SELECT match_key, match_number, comp_level,
                       blue1, blue2, blue3, red1, red2, red3
                FROM EventMatches
                WHERE LOWER(event_key) = LOWER(@eventKey) AND comp_level = 'qm'
                ORDER BY match_number ASC
            `);
        if (result.recordset.length > 0) {
            return result.recordset.map((m: any) => ({
                key: m.match_key,
                matchNumber: m.match_number,
                red: [m.red1, m.red2, m.red3].filter(Boolean),
                blue: [m.blue1, m.blue2, m.blue3].filter(Boolean),
            }));
        }
    } catch (e) {
        console.warn('[DB] EventMatches fallback to TBA:', e);
    }

    // Fall back to TBA
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
                FROM frc6377MatchScouting
                WHERE LOWER(event_key) = LOWER(@eventKey)
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
 * Returns all teams registered at an event.
 * Tries DB TeamsAtEvent first, falls back to keys extracted from scouting data.
 * Merges with TBA names when available.
 */
export async function getEventTeamList(
    eventKey: string,
    tbaTeams: { key: string; nickname?: string; team_number?: number }[] = []
): Promise<{ teamKey: string; teamNum: number; name: string }[]> {
    // Build name map from TBA
    const nameMap: Record<string, string> = {};
    tbaTeams.forEach(t => {
        nameMap[t.key] = t.nickname || String(t.team_number ?? t.key.replace('frc', ''));
    });

    // Try DB TeamsAtEvent table
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('eventKey', sql.NVarChar(20), eventKey)
            .query(`
                SELECT tae.frc_team, t.name
                FROM TeamsAtEvent tae
                LEFT JOIN Teams t ON t.frc_team = tae.frc_team
                WHERE LOWER(tae.event_key) = LOWER(@eventKey)
                ORDER BY TRY_CAST(tae.frc_team AS INT) ASC
            `);

        if (result.recordset.length > 0) {
            return result.recordset.map((r: any) => {
                const num = Number(r.frc_team);
                const key = `frc${r.frc_team}`;
                return {
                    teamKey: key,
                    teamNum: num,
                    name: nameMap[key] || r.name || String(r.frc_team),
                };
            });
        }
    } catch (e) {
        console.warn(`[DB] TeamsAtEvent fallback for ${eventKey}:`, e);
    }

    // Fall back: if TBA gave us teams, use those
    if (tbaTeams.length > 0) {
        return tbaTeams.map(t => ({
            teamKey: t.key,
            teamNum: t.team_number ?? parseInt(t.key.replace('frc', ''), 10),
            name: t.nickname || String(t.team_number ?? t.key.replace('frc', '')),
        }));
    }

    return [];
}

// ---------------------------------------------------------------------------
// Pit Scouting — frc6377TeamScoutingPrivate
// ---------------------------------------------------------------------------

export interface PitReport {
    primaryKey: string;
    teamKey: string;        // frcXXXX
    eventKey: string;
    scoutedBy: string;
    // Physical
    weightLbs: number | null;
    heightIn: number | null;
    widthIn: number | null;
    lengthIn: number | null;
    // Drivetrain / Mechanism
    drivebase: string;
    codeLanguage: string;
    turret: string;
    climb: string;
    climbPosition1: string;
    climbPosition2: string;
    climbPartners: number;
    autoClimb: string;
    // Hopper / Fuel
    hopperCapacity: number | null;
    hopperLengthIn: number | null;
    hopperWidthIn: number | null;
    hopperHeightIn: number | null;
    // Field capabilities
    trench: string;
    bump: string;
    bumpPractice: string;
    canLob: string;
    canDoze: string;
    pickupFloor: string;
    pickupOutpost: string;
    // Auto preferences
    autoPrefStart: string;
    autoPrefPickup: string;
    // Other
    preferredDs: string;
    shiftTracking: string;
    kitbot: string;
    kitbotModified: string;
    humanPlayer: string;
    humanPlayerHeight: string;
    robotQuality: number;
    pitQuality: number;
    otherNotes: string;
    robotImageUrl: string | null;
}

function rowToPitReport(r: Record<string, unknown>): PitReport {
    return {
        primaryKey:       String(r.primary_key ?? ''),
        teamKey:          `frc${r.frc_team}`,
        eventKey:         String(r.event_key ?? ''),
        scoutedBy:        String(r.scouted_by ?? ''),
        weightLbs:        r.weight_lbs != null ? Number(r.weight_lbs) : null,
        heightIn:         r.height_in  != null ? Number(r.height_in)  : null,
        widthIn:          r.width_in   != null ? Number(r.width_in)   : null,
        lengthIn:         r.length_in  != null ? Number(r.length_in)  : null,
        drivebase:        String(r.drivebase ?? '').trim(),
        codeLanguage:     String(r.code_language ?? '').trim(),
        turret:           String(r.turret ?? '').trim(),
        climb:            String(r.climb ?? '').trim(),
        climbPosition1:   String(r.climb_position_1 ?? '').trim(),
        climbPosition2:   String(r.climb_position_2 ?? '').trim(),
        climbPartners:    Number(r.climb_partners ?? 0),
        autoClimb:        String(r.auto_climb ?? '').trim(),
        hopperCapacity:   r.hopper_capacity != null ? Number(r.hopper_capacity) : null,
        hopperLengthIn:   r.hopper_length_in != null ? Number(r.hopper_length_in) : null,
        hopperWidthIn:    r.hopper_width_in  != null ? Number(r.hopper_width_in)  : null,
        hopperHeightIn:   r.hopper_height_in != null ? Number(r.hopper_height_in) : null,
        trench:           String(r.trench ?? '').trim(),
        bump:             String(r.bump ?? '').trim(),
        bumpPractice:     String(r.bump_practice ?? '').trim(),
        canLob:           String(r.can_lob ?? '').trim(),
        canDoze:          String(r.can_doze ?? '').trim(),
        pickupFloor:      String(r.pickup_floor ?? '').trim(),
        pickupOutpost:    String(r.pickup_outpost ?? '').trim(),
        autoPrefStart:    String(r.auto_pref_start ?? '').trim(),
        autoPrefPickup:   String(r.auto_pref_pickup ?? '').trim(),
        preferredDs:      String(r.preferred_ds ?? '').trim(),
        shiftTracking:    String(r.shift_tracking ?? '').trim(),
        kitbot:           String(r.kitbot ?? '').trim(),
        kitbotModified:   String(r.kitbot_modified ?? '').trim(),
        humanPlayer:      String(r.human_player ?? '').trim(),
        humanPlayerHeight:String(r.human_player_height ?? '').trim(),
        robotQuality:     Number(r.robot_quality ?? 0),
        pitQuality:       Number(r.pit_quality ?? 0),
        otherNotes:       String(r.other_notes ?? '').trim(),
        robotImageUrl:    r.robot_image_url ? String(r.robot_image_url) : null,
    };
}

/** Get pit report for one team at one event (most recent if multiple) */
export async function getPitReport(teamKey: string, eventKey: string): Promise<PitReport | null> {
    const teamNum = teamKey.replace('frc', '');
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('frcTeam',  sql.NVarChar(10),  teamNum)
            .input('eventKey', sql.NVarChar(20), eventKey)
            .query(`
                SELECT TOP 1 * FROM frc6377TeamScoutingPrivate
                WHERE frc_team = @frcTeam
                  AND LOWER(event_key) = LOWER(@eventKey)
            `);
        if (result.recordset.length === 0) return null;
        return rowToPitReport(result.recordset[0] as Record<string, unknown>);
    } catch (e) {
        console.warn(`[DB] getPitReport error for ${teamKey}:`, e);
        return null;
    }
}

/** Get all pit reports for an event */
export async function getAllPitReports(eventKey: string): Promise<PitReport[]> {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('eventKey', sql.NVarChar(20), eventKey)
            .query(`
                SELECT * FROM frc6377TeamScoutingPrivate
                WHERE event_key = @event_key
                ORDER BY TRY_CAST(frc_team AS INT) ASC
            `);
        return result.recordset.map((r: any) => rowToPitReport(r as Record<string, unknown>));
    } catch (e) {
        console.warn(`[DB] getAllPitReports error for ${eventKey}:`, e);
        return [];
    }
}

/**
 * Returns all known events from frc6377Events table in Azure SQL.
 */
export async function getAvailableEvents(): Promise<{ key: string; name: string; location: string }[]> {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT event_key, event_name
            FROM frc6377Events
            WHERE LOWER(event_key) IN ('2026howdy','2026txcle','2026txman')
            ORDER BY event_key ASC
        `);
        if (result.recordset.length > 0) {
            return result.recordset.map((r: { event_key: string; event_name: string }) => ({
                key: r.event_key,
                name: r.event_name,
                location: r.event_key === '2026txcle' ? 'Houston, TX'
                         : r.event_key === '2026txman' ? 'Manor, TX'
                         : 'Houston, TX',
            }));
        }
    } catch (e) {
        console.error('[DB] Error loading available events:', e);
    }
    // Fallback: hardcoded events
    return [
        { key: '2026howdy', name: 'HowdyScout Practice', location: 'Houston, TX' },
        { key: '2026txcle', name: 'Space City #1',       location: 'Houston, TX' },
        { key: '2026txman', name: 'Manor District',      location: 'Manor, TX' },
    ];
}


