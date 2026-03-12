'use server';

import { getPool, sql } from './db';
import { generateMatchStrategy } from './ai';

export async function saveScoutReport(report: any) {
    try {
        const pool = await getPool();

        // REBUILT 2026 — map form fields to frc6377MatchScouting columns
        const autoFuel: number     = Number(report.auto?.fuel ?? report.auto?.fuel_scored ?? 0);
        const teleFuel: number     = Number(report.tele?.fuel ?? report.tele?.fuel_scored ?? 0);
        // towerLevel from form → climb_level in DB
        const autoClimbLevel: string = report.auto?.towerLevel || report.auto?.climb_level || 'No Attempt';
        const teleClimbLevel: string = report.tele?.towerLevel || report.tele?.climb_level || 'No Attempt';
        const autoMoved: string    = (report.auto?.moved) ? 'Yes' : 'No';
        const mechFailure: string  = (report.mech_failure) ? 'Yes' : 'No';
        const defenderRating: number = Number(report.defender_rating) || 0;
        const otherNotes: string   = String(report.notes || report.other_notes || '').trim();

        const teamNum = String(report.team).replace('frc', '');
        const eventKey: string   = report.eventKey || '2026txcle';
        const matchKey: string   = report.match || '';
        const compLevel: string  = 'qm';
        const matchNumber        = parseInt(matchKey.split('_qm').pop() || '0', 10);
        const driverStation: string = report.driver_station || '';
        const scoutedBy: string  = report.scouter || 'Unknown';
        const primaryKey         = `${teamNum}-${matchKey}-${scoutedBy}`;

        await pool.request()
            .input('primary_key',      sql.NVarChar(100), primaryKey)
            .input('frc_team',         sql.NVarChar(10),  teamNum)
            .input('event_key',        sql.NVarChar(20),  eventKey)
            .input('match_key',        sql.NVarChar(50),  matchKey)
            .input('driver_station',   sql.NVarChar(10),  driverStation)
            .input('comp_level',       sql.NVarChar(5),   compLevel)
            .input('match_number',     sql.Int,           matchNumber)
            .input('auto_moved',       sql.NVarChar(5),   autoMoved)
            .input('auto_fuel_scored', sql.Int,           autoFuel)
            .input('auto_fuel_missed', sql.Int,           0)
            .input('auto_climb_level', sql.NVarChar(20),  autoClimbLevel)
            .input('auto_climb_position', sql.NVarChar(20), 'No Attempt')
            .input('tele_fuel_scored', sql.Int,           teleFuel)
            .input('tele_fuel_missed', sql.Int,           0)
            .input('tele_human_fuel_scored', sql.Int,     0)
            .input('tele_human_fuel_missed', sql.Int,     0)
            .input('tele_climb_level', sql.NVarChar(20),  teleClimbLevel)
            .input('tele_climb_position', sql.NVarChar(20), 'No Attempt')
            .input('defender_rating',  sql.Int,           defenderRating)
            .input('mech_failure',     sql.NVarChar(5),   mechFailure)
            .input('scouted_by',       sql.NVarChar(100), scoutedBy)
            .query(`
                MERGE frc6377MatchScouting AS target
                USING (SELECT @primary_key AS primary_key) AS source
                    ON target.primary_key = source.primary_key
                WHEN NOT MATCHED THEN
                    INSERT (
                        primary_key, frc_team, event_key, match_key, driver_station,
                        comp_level, match_number, auto_moved, auto_fuel_scored, auto_fuel_missed,
                        auto_climb_level, auto_climb_position,
                        tele_fuel_scored, tele_fuel_missed, tele_human_fuel_scored, tele_human_fuel_missed,
                        tele_climb_level, tele_climb_position,
                        defender_rating, mech_failure, scouted_by
                    )
                    VALUES (
                        @primary_key, @frc_team, @event_key, @match_key, @driver_station,
                        @comp_level, @match_number, @auto_moved, @auto_fuel_scored, @auto_fuel_missed,
                        @auto_climb_level, @auto_climb_position,
                        @tele_fuel_scored, @tele_fuel_missed, @tele_human_fuel_scored, @tele_human_fuel_missed,
                        @tele_climb_level, @tele_climb_position,
                        @defender_rating, @mech_failure, @scouted_by
                    )
                WHEN MATCHED THEN
                    UPDATE SET
                        auto_moved = @auto_moved,
                        auto_fuel_scored = @auto_fuel_scored,
                        auto_climb_level = @auto_climb_level,
                        tele_fuel_scored = @tele_fuel_scored,
                        tele_climb_level = @tele_climb_level,
                        defender_rating  = @defender_rating,
                        mech_failure     = @mech_failure,
                        scouted_by       = @scouted_by;
            `);

        // Save notes to frc6377MatchScoutingPrivate (the dedicated notes table)
        const privateKey = `${teamNum}-${matchKey}-${driverStation}-${scoutedBy}`;
        await pool.request()
            .input('private_key',    sql.NVarChar(200), privateKey)
            .input('frc_team',       sql.NVarChar(10),  teamNum)
            .input('event_key',      sql.NVarChar(20),  eventKey)
            .input('match_key',      sql.NVarChar(50),  matchKey)
            .input('driver_station', sql.NVarChar(10),  driverStation)
            .input('comp_level',     sql.NVarChar(5),   compLevel)
            .input('match_number',   sql.Int,           matchNumber)
            .input('scouted_by',     sql.NVarChar(100), scoutedBy)
            .input('other_notes',    sql.NVarChar(4000), otherNotes)
            .query(`
                MERGE frc6377MatchScoutingPrivate AS target
                USING (SELECT @private_key AS primary_key) AS source
                    ON target.primary_key = source.primary_key
                WHEN NOT MATCHED THEN
                    INSERT (primary_key, frc_team, event_key, match_key, driver_station, comp_level, match_number, scouted_by, other_notes)
                    VALUES (@private_key, @frc_team, @event_key, @match_key, @driver_station, @comp_level, @match_number, @scouted_by, @other_notes)
                WHEN MATCHED THEN
                    UPDATE SET other_notes = @other_notes, scouted_by = @scouted_by;
            `);

        return { success: true };
    } catch (e) {
        console.error('[DB] Failed to save report:', e);
        return { success: false, error: String(e) };
    }
}

export async function savePitReport(report: Record<string, unknown>) {
    try {
        const pool = await getPool();
        const teamNum   = String(report.team ?? '').replace('frc', '');
        const eventKey  = String(report.eventKey ?? '2026txcle');
        const scoutedBy = String(report.scouter ?? 'Unknown');
        const primaryKey = `${eventKey}-${teamNum}`;

        const n = (v: unknown) => (v != null && v !== '' ? Number(v) : null);
        const s = (v: unknown) => String(v ?? '').trim();

        await pool.request()
            .input('primary_key',         sql.NVarChar(100), primaryKey)
            .input('frc_team',            sql.NVarChar(10),  teamNum)
            .input('event_key',           sql.NVarChar(20),  eventKey)
            .input('scouted_by',          sql.NVarChar(100), scoutedBy)
            .input('weight_lbs',          sql.Float,         n(report.weight_lbs))
            .input('height_in',           sql.Float,         n(report.height_in))
            .input('width_in',            sql.Float,         n(report.width_in))
            .input('length_in',           sql.Float,         n(report.length_in))
            .input('drivebase',           sql.NVarChar(50),  s(report.drivebase))
            .input('code_language',       sql.NVarChar(50),  s(report.code_language))
            .input('turret',              sql.NVarChar(10),  s(report.turret))
            .input('climb',               sql.NVarChar(20),  s(report.climb))
            .input('climb_position_1',    sql.NVarChar(50),  s(report.climb_position_1))
            .input('climb_position_2',    sql.NVarChar(50),  s(report.climb_position_2))
            .input('climb_partners',      sql.Int,           n(report.climb_partners) ?? 0)
            .input('auto_climb',          sql.NVarChar(10),  s(report.auto_climb))
            .input('auto_pref_start',     sql.NVarChar(50),  s(report.auto_pref_start))
            .input('auto_pref_pickup',    sql.NVarChar(10),  s(report.auto_pref_pickup))
            .input('hopper_capacity',     sql.Int,           n(report.hopper_capacity))
            .input('hopper_length_in',    sql.Float,         n(report.hopper_length_in))
            .input('hopper_width_in',     sql.Float,         n(report.hopper_width_in))
            .input('hopper_height_in',    sql.Float,         n(report.hopper_height_in))
            .input('trench',              sql.NVarChar(10),  s(report.trench))
            .input('bump',                sql.NVarChar(10),  s(report.bump))
            .input('bump_practice',       sql.NVarChar(10),  s(report.bump_practice))
            .input('can_lob',             sql.NVarChar(10),  s(report.can_lob))
            .input('can_doze',            sql.NVarChar(10),  s(report.can_doze))
            .input('pickup_floor',        sql.NVarChar(10),  s(report.pickup_floor))
            .input('pickup_outpost',      sql.NVarChar(10),  s(report.pickup_outpost))
            .input('preferred_ds',        sql.NVarChar(20),  s(report.preferred_ds))
            .input('shift_tracking',      sql.NVarChar(10),  s(report.shift_tracking))
            .input('kitbot',              sql.NVarChar(50),  s(report.kitbot))
            .input('kitbot_modified',     sql.NVarChar(200), s(report.kitbot_modified))
            .input('human_player',        sql.NVarChar(100), s(report.human_player))
            .input('human_player_height', sql.NVarChar(20),  s(report.human_player_height))
            .input('robot_quality',       sql.Int,           n(report.robot_quality) ?? 0)
            .input('pit_quality',         sql.Int,           n(report.pit_quality) ?? 0)
            .input('other_notes',         sql.NVarChar(sql.MAX), s(report.other_notes))
            .input('robot_image_url',     sql.NVarChar(sql.MAX), s(report.robot_image_url))
            .query(`
                MERGE frc6377TeamScoutingPrivate AS target
                USING (SELECT @primary_key AS primary_key) AS source
                    ON target.primary_key = source.primary_key
                WHEN NOT MATCHED THEN INSERT (
                    primary_key, frc_team, event_key, scouted_by,
                    weight_lbs, height_in, width_in, length_in,
                    drivebase, code_language, turret,
                    climb, climb_position_1, climb_position_2, climb_partners, auto_climb,
                    auto_pref_start, auto_pref_pickup,
                    hopper_capacity, hopper_length_in, hopper_width_in, hopper_height_in,
                    trench, bump, bump_practice, can_lob, can_doze,
                    pickup_floor, pickup_outpost, preferred_ds, shift_tracking,
                    kitbot, kitbot_modified, human_player, human_player_height,
                    robot_quality, pit_quality, other_notes, robot_image_url
                ) VALUES (
                    @primary_key, @frc_team, @event_key, @scouted_by,
                    @weight_lbs, @height_in, @width_in, @length_in,
                    @drivebase, @code_language, @turret,
                    @climb, @climb_position_1, @climb_position_2, @climb_partners, @auto_climb,
                    @auto_pref_start, @auto_pref_pickup,
                    @hopper_capacity, @hopper_length_in, @hopper_width_in, @hopper_height_in,
                    @trench, @bump, @bump_practice, @can_lob, @can_doze,
                    @pickup_floor, @pickup_outpost, @preferred_ds, @shift_tracking,
                    @kitbot, @kitbot_modified, @human_player, @human_player_height,
                    @robot_quality, @pit_quality, @other_notes, @robot_image_url
                )
                WHEN MATCHED THEN UPDATE SET
                    scouted_by = @scouted_by,
                    weight_lbs = @weight_lbs, height_in = @height_in, width_in = @width_in, length_in = @length_in,
                    drivebase = @drivebase, code_language = @code_language, turret = @turret,
                    climb = @climb, climb_position_1 = @climb_position_1, climb_position_2 = @climb_position_2,
                    climb_partners = @climb_partners, auto_climb = @auto_climb,
                    auto_pref_start = @auto_pref_start, auto_pref_pickup = @auto_pref_pickup,
                    hopper_capacity = @hopper_capacity, hopper_length_in = @hopper_length_in,
                    hopper_width_in = @hopper_width_in, hopper_height_in = @hopper_height_in,
                    trench = @trench, bump = @bump, bump_practice = @bump_practice,
                    can_lob = @can_lob, can_doze = @can_doze,
                    pickup_floor = @pickup_floor, pickup_outpost = @pickup_outpost,
                    preferred_ds = @preferred_ds, shift_tracking = @shift_tracking,
                    kitbot = @kitbot, kitbot_modified = @kitbot_modified,
                    human_player = @human_player, human_player_height = @human_player_height,
                    robot_quality = @robot_quality, pit_quality = @pit_quality, other_notes = @other_notes,
                    robot_image_url = CASE WHEN @robot_image_url <> '' THEN @robot_image_url ELSE robot_image_url END;
            `);
        return { success: true };
    } catch (e) {
        console.error('[DB] Failed to save pit report:', e);
        return { success: false, error: String(e) };
    }
}

// ---------------------------------------------------------------------------
// Full Export — all teams raw data + analysis + pit + EPA
// ---------------------------------------------------------------------------

export interface TeamExportRow {
    teamNumber: number;
    teamName: string;
    rank: number | null;
    wins: number;
    losses: number;
    ties: number;
    rankingPoints: number;
    ourEPA: number;
    sbEPA: number | null;
    matchesScouted: number;
    failureRate: number;
    consistencyScore: number;
    riskLevel: string;
    synergyScore: number;
    role: string;
    strengths: string[];
    allNotes: string[];
    // Pit scouting fields
    pitDrivebase: string;
    pitClimb: string;
    pitClimbPartners: number;
    pitAutoClimb: string;
    pitHopperCapacity: number | null;
    pitTrench: string;
    pitBump: string;
    pitCanLob: string;
    pitCanDoze: string;
    pitPickupFloor: string;
    pitPickupOutpost: string;
    pitKitbot: string;
    pitRobotQuality: number;
    pitPitQuality: number;
    pitNotes: string;
    // Raw match data (JSON string in CSV, array in JSON)
    matchData: Array<{
        matchKey: string;
        autoFuel: number;
        teleFuel: number;
        autoClimb: string;
        teleClimb: string;
        mechFailure: boolean;
        defenderRating: number;
        notes: string;
    }>;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function exportAllTeamsAction(eventKey: string): Promise<TeamExportRow[]> {
    try {
        const [
            { getMissionData, getEventTeamList, getAllPitReports },
            { getEventTeams },
            { getStatboticsEvent },
            { calculateTeamEPA },
            { calculateAllTeamReliability },
            { generatePickList },
        ] = await Promise.all([
            import('./data'),
            import('./tba'),
            import('./statbotics'),
            import('./spr'),
            import('./reliability'),
            import('./pickList'),
        ]);

        const [{ reports }, tbaTeams, statboticsData, pitReports] = await Promise.all([
            getMissionData(eventKey),
            getEventTeams(eventKey),
            getStatboticsEvent(eventKey),
            getAllPitReports(eventKey),
        ]);

        const rosterList = await getEventTeamList(eventKey, tbaTeams);

        const teamNameMap: Record<string, string> = {};
        tbaTeams.forEach((t: { key: string; nickname?: string; team_number?: number }) => {
            teamNameMap[t.key] = t.nickname || String(t.team_number);
        });
        rosterList.forEach((r: { teamKey: string; name: string }) => {
            if (!teamNameMap[r.teamKey]) teamNameMap[r.teamKey] = r.name;
        });

        const reliabilityData = calculateAllTeamReliability(reports);
        const pickListData = generatePickList(reports, reliabilityData);

        const allScoutedKeys = Array.from(new Set(reports.map((r: any) => r.teamKey)));
        const rosterKeys = new Set(rosterList.map((r: any) => r.teamKey));
        const allTeamKeys = [
            ...rosterList.map((r: any) => r.teamKey),
            ...allScoutedKeys.filter((k: any) => !rosterKeys.has(k)),
        ];

        const rows: TeamExportRow[] = Array.from(new Set(allTeamKeys)).map(teamKey => {
            const teamNum = parseInt(teamKey.replace('frc', ''), 10);
            const teamReports = reports.filter((r: any) => r.teamKey === teamKey);
            const ourEPA = calculateTeamEPA(teamReports);

            const sbData = (statboticsData as any[]).find((s: any) => s.team === teamNum);
            const sbEPA = sbData?.epa?.breakdown?.total_points ?? null;

            const reliability = reliabilityData.find((r: any) => r.teamKey === teamKey);
            const synergy = pickListData.find((p: any) => p.teamKey === teamKey);
            const pit = pitReports.find((p: any) => p.teamKey === teamKey);

            const matchNotes = teamReports.map((r: any) => r.data?.notes).filter(Boolean) as string[];
            const allNotes = [
                ...(pit?.otherNotes ? [pit.otherNotes] : []),
                ...matchNotes,
            ];

            const matchData = teamReports.map((r: any) => ({
                matchKey: r.matchKey,
                autoFuel: r.data?.auto?.fuel_scored ?? 0,
                teleFuel: r.data?.teleop?.fuel_scored ?? 0,
                autoClimb: r.data?.auto?.climb_level ?? 'No Attempt',
                teleClimb: r.data?.teleop?.climb_level ?? 'No Attempt',
                mechFailure: r.data?.mech_failure ?? false,
                defenderRating: r.data?.defender_rating ?? 0,
                notes: r.data?.notes ?? '',
            }));

            const sbRecord = sbData?.record?.qual ?? {};

            return {
                teamNumber: teamNum,
                teamName: teamNameMap[teamKey] || `Team ${teamNum}`,
                rank: sbRecord?.rank ?? null,
                wins: sbRecord?.wins ?? 0,
                losses: sbRecord?.losses ?? 0,
                ties: sbRecord?.ties ?? 0,
                rankingPoints: sbRecord?.rps ?? 0,
                ourEPA,
                sbEPA,
                matchesScouted: teamReports.length,
                failureRate: reliability?.failureRate ?? 0,
                consistencyScore: reliability?.consistencyScore ?? 50,
                riskLevel: reliability?.riskLevel ?? 'medium',
                synergyScore: synergy?.synergyScore ?? 0,
                role: synergy?.role ?? 'balanced',
                strengths: synergy?.strengths ?? [],
                allNotes,
                pitDrivebase: pit?.drivebase ?? '',
                pitClimb: pit?.climb ?? '',
                pitClimbPartners: pit?.climbPartners ?? 0,
                pitAutoClimb: pit?.autoClimb ?? '',
                pitHopperCapacity: pit?.hopperCapacity ?? null,
                pitTrench: pit?.trench ?? '',
                pitBump: pit?.bump ?? '',
                pitCanLob: pit?.canLob ?? '',
                pitCanDoze: pit?.canDoze ?? '',
                pitPickupFloor: pit?.pickupFloor ?? '',
                pitPickupOutpost: pit?.pickupOutpost ?? '',
                pitKitbot: pit?.kitbot ?? '',
                pitRobotQuality: pit?.robotQuality ?? 0,
                pitPitQuality: pit?.pitQuality ?? 0,
                pitNotes: pit?.otherNotes ?? '',
                matchData,
            };
        }).sort((a, b) => {
            if (a.matchesScouted > 0 && b.matchesScouted === 0) return -1;
            if (a.matchesScouted === 0 && b.matchesScouted > 0) return 1;
            if (a.matchesScouted > 0) return b.ourEPA - a.ourEPA;
            return a.teamNumber - b.teamNumber;
        });

        return rows;
    } catch (e) {
        console.error('[Export] exportAllTeamsAction error:', e);
        return [];
    }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function getTeamStrategyAction(
    teamKey: string,
    nickname: string,
    reports: Record<string, unknown>[],
    pitReport: Record<string, unknown> | null
): Promise<string> {
    const { generateTeamStrategy } = await import('./ai');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return generateTeamStrategy(teamKey, nickname, reports as any[], pitReport as any);
}

export async function getTacticalStrategy(matchKey: string, alliance: 'red' | 'blue', allianceData: any[], opponentData: any[]) {
    try {
        return await generateMatchStrategy(matchKey, alliance, allianceData, opponentData);
    } catch (e) {
        console.error('Tactical strategy error:', e);
        return 'Tactical link severed.';
    }
}
