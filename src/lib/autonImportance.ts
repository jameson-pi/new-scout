/**
 * Auton Importance Analysis
 *
 * Analyzes FRC match data to quantify how often winning autonomous (auto) by
 * exactly 1 point correlates with winning the full match.
 *
 * Data sources:
 *   - The Blue Alliance API  (env: TBA_AUTH_KEY)
 *   - Statbotics API         (env: STATBOTICS_API_BASE, optional override)
 */

// ---------------------------------------------------------------------------
// Constants / configuration
// ---------------------------------------------------------------------------

export const TBA_BASE_URL = 'https://www.thebluealliance.com/api/v3';
export const DEFAULT_STATBOTICS_BASE = 'https://api.statbotics.io/v3';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TBAScoreBreakdown {
    autoPoints?: number;
    // 2024 Crescendo
    autoAmpNotePoints?: number;
    autoSpeakerNotePoints?: number;
    autoLeavePoints?: number;
    // 2023 Charged Up
    autoChargeStationPoints?: number;
    autoMobilityPoints?: number;
    autoDockingPoints?: number;
    // 2022 Rapid React
    taxiPoints?: number;
    cargoPoints?: number;
    // 2020/2021
    autoInitLinePoints?: number;
    autoCellPoints?: number;
    // 2019 Destination Deep Space
    habLinePoints?: number;
    // 2018 POWER UP
    autoRunPoints?: number;
    autoOwnershipPoints?: number;
    autoQuestPoints?: number;
    // 2026 REBUILT - possible field names
    autoAlgaePoints?: number;
    autoCoralPoints?: number;
    [key: string]: number | undefined;
}

export interface TBAAlliance {
    score: number;
    team_keys: string[];
}

export interface TBAMatch {
    key: string;
    event_key?: string;
    match_number: number;
    comp_level: 'qm' | 'ef' | 'qf' | 'sf' | 'f';
    alliances: {
        red: TBAAlliance;
        blue: TBAAlliance;
    };
    score_breakdown?: {
        red?: TBAScoreBreakdown;
        blue?: TBAScoreBreakdown;
    } | null;
    actual_time?: number | null;
    winning_alliance?: 'red' | 'blue' | '';
    year?: number;
}

export interface StatboticsTeam {
    team: number;
    event: string;
    epa?: {
        total_points?: { mean: number; sd?: number };
        breakdown?: {
            auto_points?: number;
            [key: string]: number | undefined;
        };
    };
}

export type MatchResult = 'win' | 'loss' | 'tie';

export interface AutonMatchRecord {
    matchKey: string;
    eventKey: string;
    compLevel: string;
    year: number;

    /** Alliance that won auton by 1 point ('red' or 'blue') */
    autonWinnerAlliance: 'red' | 'blue';
    autonBlue: number;
    autonRed: number;
    /** Always +1 from auton winner's perspective */
    autonMargin: 1;

    finalScoreBlue: number;
    finalScoreRed: number;
    finalMargin: number; // blue - red (positive = blue won)

    /** 'win' | 'loss' | 'tie' from the auton winner's perspective */
    matchResultForAutonWinner: MatchResult;

    // Statbotics enrichment (optional)
    epaRed?: number;
    epaBlue?: number;
    epaDiff?: number; // blue - red
}

export interface AutonImportanceSummary {
    totalMatches: number;
    wins: number;
    losses: number;
    ties: number;
    winPct: number;
    lossPct: number;
    tiePct: number;
    finalMarginDistribution: Record<number, number>; // finalMargin -> count
}

export interface AutonImportanceResult {
    year: number;
    filters: {
        event?: string;
        level?: string;
        limit?: number;
    };
    records: AutonMatchRecord[];
    summary: AutonImportanceSummary;
    bySeason: Record<number, AutonImportanceSummary>;
    byEvent: Record<string, AutonImportanceSummary>;
}

// ---------------------------------------------------------------------------
// Auton score extraction
// ---------------------------------------------------------------------------

/**
 * Extract the autonomous score for an alliance from a TBA score_breakdown.
 * Tries explicit `autoPoints` first; falls back to summing known auto
 * sub-component fields so the tool works across multiple seasons.
 */
export function extractAutonScore(breakdown: TBAScoreBreakdown | undefined | null): number {
    if (!breakdown) return 0;

    // Most seasons expose a top-level autoPoints field
    if (typeof breakdown.autoPoints === 'number') {
        return breakdown.autoPoints;
    }

    // 2024 Crescendo
    if (
        breakdown.autoAmpNotePoints !== undefined ||
        breakdown.autoSpeakerNotePoints !== undefined ||
        breakdown.autoLeavePoints !== undefined
    ) {
        return (
            (breakdown.autoAmpNotePoints ?? 0) +
            (breakdown.autoSpeakerNotePoints ?? 0) +
            (breakdown.autoLeavePoints ?? 0)
        );
    }

    // 2023 Charged Up
    if (
        breakdown.autoChargeStationPoints !== undefined ||
        breakdown.autoMobilityPoints !== undefined
    ) {
        return (
            (breakdown.autoMobilityPoints ?? 0) +
            (breakdown.autoChargeStationPoints ?? 0)
        );
    }

    // 2022 Rapid React — auto cargo + taxi
    if (breakdown.taxiPoints !== undefined) {
        return (breakdown.taxiPoints ?? 0) + (breakdown.cargoPoints ?? 0);
    }

    // 2020/2021 Infinite Recharge
    if (breakdown.autoInitLinePoints !== undefined) {
        return (breakdown.autoInitLinePoints ?? 0) + (breakdown.autoCellPoints ?? 0);
    }

    // 2026 REBUILT — check for known auto field names dynamically
    let sumFromAuto = 0;
    let foundAny = false;
    for (const [key, val] of Object.entries(breakdown)) {
        if (
            typeof val === 'number' &&
            (key.startsWith('auto') || key.startsWith('Auto')) &&
            !key.toLowerCase().includes('rp') &&
            !key.toLowerCase().includes('bonus')
        ) {
            sumFromAuto += val;
            foundAny = true;
        }
    }
    if (foundAny) return sumFromAuto;

    return 0;
}

// ---------------------------------------------------------------------------
// Match filtering
// ---------------------------------------------------------------------------

/**
 * Determine the overall match winner ('red', 'blue', or 'tie').
 */
export function getMatchWinner(match: TBAMatch): 'red' | 'blue' | 'tie' {
    if (match.winning_alliance && match.winning_alliance !== '') {
        return match.winning_alliance as 'red' | 'blue';
    }
    const red = match.alliances.red.score;
    const blue = match.alliances.blue.score;
    if (red > blue) return 'red';
    if (blue > red) return 'blue';
    return 'tie';
}

/**
 * Process a single TBA match into an AutonMatchRecord.
 * Returns null if the match does not qualify (no breakdown, no auton margin of ±1,
 * or unplayed match with score -1).
 */
export function processMatch(
    match: TBAMatch,
    year: number,
    epas?: { red: number; blue: number }
): AutonMatchRecord | null {
    // Skip unplayed matches
    if (match.alliances.red.score < 0 || match.alliances.blue.score < 0) return null;
    // Skip if no score breakdown
    if (!match.score_breakdown) return null;

    const blueBreakdown = match.score_breakdown.blue;
    const redBreakdown = match.score_breakdown.red;

    const autonBlue = extractAutonScore(blueBreakdown);
    const autonRed = extractAutonScore(redBreakdown);

    const autonDiff = autonBlue - autonRed; // positive = blue won auton

    if (Math.abs(autonDiff) !== 1) return null;

    const autonWinnerAlliance: 'red' | 'blue' = autonDiff > 0 ? 'blue' : 'red';
    const finalScoreBlue = match.alliances.blue.score;
    const finalScoreRed = match.alliances.red.score;
    const finalMargin = finalScoreBlue - finalScoreRed; // positive = blue won overall

    const matchWinner = getMatchWinner(match);
    let matchResultForAutonWinner: MatchResult;
    if (matchWinner === 'tie') {
        matchResultForAutonWinner = 'tie';
    } else if (matchWinner === autonWinnerAlliance) {
        matchResultForAutonWinner = 'win';
    } else {
        matchResultForAutonWinner = 'loss';
    }

    const eventKey = match.event_key ?? match.key.split('_')[0];

    const record: AutonMatchRecord = {
        matchKey: match.key,
        eventKey,
        compLevel: match.comp_level,
        year,
        autonWinnerAlliance,
        autonBlue,
        autonRed,
        autonMargin: 1,
        finalScoreBlue,
        finalScoreRed,
        finalMargin,
        matchResultForAutonWinner,
    };

    if (epas) {
        record.epaRed = epas.red;
        record.epaBlue = epas.blue;
        record.epaDiff = epas.blue - epas.red;
    }

    return record;
}

/**
 * Filter a list of TBA matches to only those where auton margin = ±1
 * and build the full record set.
 */
export function filterAutonByOneMargin(
    matches: TBAMatch[],
    year: number,
    options: {
        compLevel?: string;
        limit?: number;
    } = {}
): AutonMatchRecord[] {
    let filtered = matches;

    if (options.compLevel) {
        const lvl = options.compLevel.toLowerCase();
        filtered = filtered.filter((m) => m.comp_level.toLowerCase() === lvl);
    }

    const records: AutonMatchRecord[] = [];
    for (const match of filtered) {
        if (options.limit && records.length >= options.limit) break;
        const rec = processMatch(match, year);
        if (rec) records.push(rec);
    }
    return records;
}

// ---------------------------------------------------------------------------
// Aggregation / summary
// ---------------------------------------------------------------------------

export function buildSummary(records: AutonMatchRecord[]): AutonImportanceSummary {
    const wins = records.filter((r) => r.matchResultForAutonWinner === 'win').length;
    const losses = records.filter((r) => r.matchResultForAutonWinner === 'loss').length;
    const ties = records.filter((r) => r.matchResultForAutonWinner === 'tie').length;
    const total = records.length;

    const dist: Record<number, number> = {};
    for (const r of records) {
        // Express margin from the auton-winner's perspective
        const margin = r.autonWinnerAlliance === 'blue' ? r.finalMargin : -r.finalMargin;
        dist[margin] = (dist[margin] ?? 0) + 1;
    }

    return {
        totalMatches: total,
        wins,
        losses,
        ties,
        winPct: total > 0 ? (wins / total) * 100 : 0,
        lossPct: total > 0 ? (losses / total) * 100 : 0,
        tiePct: total > 0 ? (ties / total) * 100 : 0,
        finalMarginDistribution: dist,
    };
}

// ---------------------------------------------------------------------------
// TBA API helpers
// ---------------------------------------------------------------------------

function makeTbaHeaders(): Record<string, string> {
    const key = process.env.TBA_AUTH_KEY;
    if (!key) {
        throw new Error('TBA_AUTH_KEY environment variable is not set.');
    }
    return { 'X-TBA-Auth-Key': key };
}

async function tbaFetch(path: string): Promise<unknown> {
    const url = `${TBA_BASE_URL}${path}`;
    const res = await fetch(url, { headers: makeTbaHeaders() });
    if (!res.ok) {
        throw new Error(`TBA API error ${res.status} for ${url}: ${res.statusText}`);
    }
    return res.json();
}

export async function fetchEventsForYear(year: number): Promise<{ key: string }[]> {
    return tbaFetch(`/events/${year}/simple`) as Promise<{ key: string }[]>;
}

export async function fetchMatchesForEvent(eventKey: string): Promise<TBAMatch[]> {
    try {
        const matches = (await tbaFetch(`/event/${eventKey}/matches`)) as TBAMatch[];
        return matches.map((m) => ({ ...m, event_key: eventKey }));
    } catch (e) {
        console.warn(`Skipping event ${eventKey}: ${(e as Error).message}`);
        return [];
    }
}

// ---------------------------------------------------------------------------
// Statbotics API helpers
// ---------------------------------------------------------------------------

function statboticsBase(): string {
    return process.env.STATBOTICS_API_BASE || DEFAULT_STATBOTICS_BASE;
}

export interface StatboticsMatch {
    key: string;
    event: string;
    red_epa_sum?: number;
    blue_epa_sum?: number;
    red?: { total_points?: { mean?: number } };
    blue?: { total_points?: { mean?: number } };
    // Statbotics v3 match object uses epa sums directly
    epa?: {
        red?: number | null;
        blue?: number | null;
    };
    pred?: {
        red_score?: number;
        blue_score?: number;
    };
}

export async function fetchStatboticsMatchesForEvent(
    eventKey: string
): Promise<StatboticsMatch[]> {
    const url = `${statboticsBase()}/matches?event=${eventKey}&limit=500`;
    try {
        const res = await fetch(url);
        if (!res.ok) return [];
        return res.json() as Promise<StatboticsMatch[]>;
    } catch {
        return [];
    }
}

/**
 * Build a lookup map: matchKey -> { red: epaSum, blue: epaSum }
 */
export function buildEpaLookup(
    statboticsMatches: StatboticsMatch[]
): Map<string, { red: number; blue: number }> {
    const map = new Map<string, { red: number; blue: number }>();
    for (const sm of statboticsMatches) {
        const red =
            sm.red_epa_sum ??
            sm.epa?.red ??
            sm.pred?.red_score ??
            0;
        const blue =
            sm.blue_epa_sum ??
            sm.epa?.blue ??
            sm.pred?.blue_score ??
            0;
        map.set(sm.key, { red: Number(red) || 0, blue: Number(blue) || 0 });
    }
    return map;
}

// ---------------------------------------------------------------------------
// Main analysis function
// ---------------------------------------------------------------------------

export interface AnalysisOptions {
    year: number;
    event?: string;
    level?: string;
    limit?: number;
    useStatbotics?: boolean;
}

export async function runAutonImportanceAnalysis(
    options: AnalysisOptions
): Promise<AutonImportanceResult> {
    const { year, event, level, limit, useStatbotics = false } = options;

    // 1. Gather events to query
    let eventKeys: string[];
    if (event) {
        eventKeys = [event];
    } else {
        const events = await fetchEventsForYear(year);
        eventKeys = events.map((e) => e.key);
    }

    // 2. Fetch TBA matches (with optional per-event Statbotics enrichment)
    const allRecords: AutonMatchRecord[] = [];

    for (const eventKey of eventKeys) {
        const matches = await fetchMatchesForEvent(eventKey);
        if (matches.length === 0) continue;

        // Build EPA lookup if requested
        let epaLookup: Map<string, { red: number; blue: number }> | undefined;
        if (useStatbotics) {
            const sbMatches = await fetchStatboticsMatchesForEvent(eventKey);
            epaLookup = buildEpaLookup(sbMatches);
        }

        // Process each match
        let levelMatches = matches;
        if (level) {
            levelMatches = matches.filter(
                (m) => m.comp_level.toLowerCase() === level.toLowerCase()
            );
        }

        for (const match of levelMatches) {
            if (limit && allRecords.length >= limit) break;
            const epas = epaLookup?.get(match.key);
            const rec = processMatch(match, year, epas);
            if (rec) allRecords.push(rec);
        }

        if (limit && allRecords.length >= limit) break;
    }

    // 3. Build summaries
    const summary = buildSummary(allRecords);

    const bySeason: Record<number, AutonImportanceSummary> = {};
    const byYearGroup: Record<number, AutonMatchRecord[]> = {};
    for (const r of allRecords) {
        (byYearGroup[r.year] = byYearGroup[r.year] ?? []).push(r);
    }
    for (const [y, recs] of Object.entries(byYearGroup)) {
        bySeason[Number(y)] = buildSummary(recs);
    }

    const byEvent: Record<string, AutonImportanceSummary> = {};
    const byEventGroup: Record<string, AutonMatchRecord[]> = {};
    for (const r of allRecords) {
        (byEventGroup[r.eventKey] = byEventGroup[r.eventKey] ?? []).push(r);
    }
    for (const [ek, recs] of Object.entries(byEventGroup)) {
        byEvent[ek] = buildSummary(recs);
    }

    return {
        year,
        filters: { event, level, limit },
        records: allRecords,
        summary,
        bySeason,
        byEvent,
    };
}
