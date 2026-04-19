/**
 * Auton Importance Analysis — 2026 REBUILT Edition
 *
 * Analyzes FRC match data to quantify how often winning the autonomous (auto)
 * period by exactly 1 point correlates with winning the full match.
 *
 * Scoring constants match the 2026 REBUILT game (see spr.ts / predictions.ts):
 *   - Fuel in auto:       1 pt / piece
 *   - Tower Level 1 auto: 15 pts
 *   - Mobility (moved):    3 pts
 *   - TBA reports the sum as `autoPoints` in score_breakdown
 *
 * Data sources:
 *   - The Blue Alliance API  (env: TBA_AUTH_KEY)  — via ./tba lib
 *   - Statbotics API         (env: STATBOTICS_API_BASE, optional)  — via ./statbotics lib
 */

import { getEventMatches, TBAMatch } from './tba';
import { getStatboticsEvent, StatboticsTeamEvent } from './statbotics';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const DEFAULT_YEAR = 2026;
export const TBA_BASE_URL = 'https://www.thebluealliance.com/api/v3';

/**
 * 2026 REBUILT auto scoring constants (mirrors spr.ts / predictions.ts).
 * TBA will report the total as `autoPoints`; these sub-components are used
 * as a fallback when only individual breakdown fields are available.
 */
export const REBUILT_AUTO_POINTS = {
    fuel: 1,          // per fuel piece scored in auto
    towerLevel1: 15,  // Tower Level 1 climb in auto
    mobility: 3,      // robot moved off the starting line
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
    finalMargin: number; // blue - red (positive = blue won overall)

    /** Result from the auton winner's perspective */
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
    finalMarginDistribution: Record<number, number>;
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

export interface AnalysisOptions {
    year?: number;
    event?: string;
    level?: string;
    limit?: number;
    useStatbotics?: boolean;
}

// ---------------------------------------------------------------------------
// Auton score extraction — 2026 REBUILT focused
// ---------------------------------------------------------------------------

/**
 * Extract the autonomous score for one alliance from a TBA score_breakdown.
 *
 * Strategy (2026 REBUILT):
 *  1. Use `autoPoints` directly — TBA provides this for all supported seasons.
 *  2. Fall back to summing 2026-specific sub-fields:
 *       autoFuelPoints + autoTowerPoints + autoMobilityPoints
 *  3. Generic catch-all: sum any field whose name starts with "auto"
 *     (excluding RP / bonus fields) — future-proofs against new TBA field names.
 */
export function extractAutonScore(breakdown: Record<string, unknown> | null | undefined): number {
    if (!breakdown) return 0;

    // TBA provides autoPoints for all seasons including 2026 REBUILT
    if (typeof breakdown.autoPoints === 'number') {
        return breakdown.autoPoints;
    }

    // 2026 REBUILT sub-components when autoPoints is not directly available:
    //   autoFuelPoints    = fuel pieces scored × REBUILT_AUTO_POINTS.fuel (1 pt each)
    //   autoTowerPoints   = Tower Level 1 climbs × REBUILT_AUTO_POINTS.towerLevel1 (15 pts)
    //   autoMobilityPoints= robots that moved × REBUILT_AUTO_POINTS.mobility (3 pts)
    if (
        breakdown.autoFuelPoints !== undefined ||
        breakdown.autoTowerPoints !== undefined ||
        breakdown.autoMobilityPoints !== undefined
    ) {
        return (
            ((breakdown.autoFuelPoints as number) ?? 0) +
            ((breakdown.autoTowerPoints as number) ?? 0) +
            ((breakdown.autoMobilityPoints as number) ?? 0)
        );
    }

    // Generic fallback: sum any numeric field starting with "auto"
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
    return foundAny ? sumFromAuto : 0;
}

// ---------------------------------------------------------------------------
// Match processing
// ---------------------------------------------------------------------------

/**
 * Determine the overall match winner ('red', 'blue', or 'tie').
 * Uses winning_alliance from TBA when available; falls back to score comparison.
 */
export function getMatchWinner(match: TBAMatch & { winning_alliance?: string }): 'red' | 'blue' | 'tie' {
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
 * Returns null when the match does not qualify:
 *   - Unplayed (score -1)
 *   - No score_breakdown
 *   - Auton margin ≠ ±1
 */
export function processMatch(
    match: TBAMatch & { event_key?: string; winning_alliance?: string },
    year: number,
    epas?: { red: number; blue: number }
): AutonMatchRecord | null {
    if (match.alliances.red.score < 0 || match.alliances.blue.score < 0) return null;
    if (!match.score_breakdown) return null;

    const breakdown = match.score_breakdown as { red?: Record<string, unknown>; blue?: Record<string, unknown> };
    const autonBlue = extractAutonScore(breakdown.blue ?? null);
    const autonRed = extractAutonScore(breakdown.red ?? null);

    const autonDiff = autonBlue - autonRed;
    if (Math.abs(autonDiff) !== 1) return null;

    const autonWinnerAlliance: 'red' | 'blue' = autonDiff > 0 ? 'blue' : 'red';
    const finalScoreBlue = match.alliances.blue.score;
    const finalScoreRed = match.alliances.red.score;
    const finalMargin = finalScoreBlue - finalScoreRed;

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
 * Filter a list of TBA matches to those where auton margin = ±1.
 */
export function filterAutonByOneMargin(
    matches: TBAMatch[],
    year: number,
    options: { compLevel?: string; limit?: number } = {}
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
// Aggregation
// ---------------------------------------------------------------------------

export function buildSummary(records: AutonMatchRecord[]): AutonImportanceSummary {
    const wins = records.filter((r) => r.matchResultForAutonWinner === 'win').length;
    const losses = records.filter((r) => r.matchResultForAutonWinner === 'loss').length;
    const ties = records.filter((r) => r.matchResultForAutonWinner === 'tie').length;
    const total = records.length;

    const dist: Record<number, number> = {};
    for (const r of records) {
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
// Statbotics EPA enrichment — uses getStatboticsEvent from ./statbotics lib
// ---------------------------------------------------------------------------

/**
 * Build per-alliance expected-points sums from Statbotics per-team event data.
 *
 * Uses `getStatboticsEvent` from the existing statbotics lib to fetch all
 * team EPAs for an event, then sums the three robots on each alliance.
 */
export function buildAllianceEpaFromTeamData(
    teamEvents: StatboticsTeamEvent[],
    redKeys: string[],
    blueKeys: string[]
): { red: number; blue: number } {
    const epaMap = new Map<number, number>();
    for (const te of teamEvents) {
        epaMap.set(te.team, te.epa.total_points.mean);
    }

    const sumEpa = (keys: string[]) =>
        keys.reduce((sum, key) => {
            const num = parseInt(key.replace('frc', ''), 10);
            return sum + (epaMap.get(num) ?? 0);
        }, 0);

    return { red: sumEpa(redKeys), blue: sumEpa(blueKeys) };
}

// ---------------------------------------------------------------------------
// TBA events helper — not available in tba.ts, kept local
// ---------------------------------------------------------------------------

export async function fetchEventsForYear(year: number): Promise<{ key: string }[]> {
    const key = process.env.TBA_AUTH_KEY || process.env.NEXT_PUBLIC_TBA_API_KEY || process.env.TBA_API_KEY;
    if (!key) throw new Error('No TBA API key set (TBA_AUTH_KEY).');
    const url = `${TBA_BASE_URL}/events/${year}/simple`;
    const res = await fetch(url, { headers: { 'X-TBA-Auth-Key': key } });
    if (!res.ok) throw new Error(`TBA API error ${res.status}: ${res.statusText}`);
    return res.json() as Promise<{ key: string }[]>;
}

// ---------------------------------------------------------------------------
// Main analysis — uses getEventMatches and getStatboticsEvent from libs
// ---------------------------------------------------------------------------

export async function runAutonImportanceAnalysis(
    options: AnalysisOptions
): Promise<AutonImportanceResult> {
    const {
        year = DEFAULT_YEAR,
        event,
        level,
        limit,
        useStatbotics = false,
    } = options;

    // 1. Determine events to analyse
    let eventKeys: string[];
    if (event) {
        eventKeys = [event];
    } else {
        const events = await fetchEventsForYear(year);
        eventKeys = events.map((e) => e.key);
    }

    // 2. Fetch and process matches per event
    const allRecords: AutonMatchRecord[] = [];

    for (const eventKey of eventKeys) {
        // Reuse the shared TBA library — respects LOCAL_ONLY_EVENTS, caching etc.
        const matches = await getEventMatches(eventKey);
        if (matches.length === 0) continue;

        // Optional Statbotics EPA enrichment using the shared statbotics lib.
        // getStatboticsEvent returns per-team EPA data; we sum per alliance.
        let teamEvents: StatboticsTeamEvent[] | undefined;
        if (useStatbotics) {
            teamEvents = await getStatboticsEvent(eventKey);
        }

        let levelMatches = matches;
        if (level) {
            levelMatches = matches.filter(
                (m) => m.comp_level.toLowerCase() === level.toLowerCase()
            );
        }

        for (const match of levelMatches) {
            if (limit && allRecords.length >= limit) break;

            let epas: { red: number; blue: number } | undefined;
            if (teamEvents && teamEvents.length > 0) {
                epas = buildAllianceEpaFromTeamData(
                    teamEvents,
                    match.alliances.red.team_keys,
                    match.alliances.blue.team_keys
                );
            }

            const rec = processMatch(
                match as TBAMatch & { event_key?: string; winning_alliance?: string },
                year,
                epas
            );
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

    return { year, filters: { event, level, limit }, records: allRecords, summary, bySeason, byEvent };
}
