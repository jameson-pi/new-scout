/**
 * Unit tests for autonImportance.ts — 2026 REBUILT Edition
 *
 * Tests cover:
 *  - extractAutonScore  (2026 REBUILT scoring: autoPoints, sub-fields, generic fallback)
 *  - getMatchWinner     (winning alliance determination)
 *  - processMatch       (full record construction + filtering)
 *  - filterAutonByOneMargin (batch filtering with comp_level / limit)
 *  - buildSummary       (aggregation)
 *  - buildAllianceEpaFromTeamData (Statbotics per-team EPA summing)
 */

import {
    extractAutonScore,
    getMatchWinner,
    processMatch,
    filterAutonByOneMargin,
    buildSummary,
    buildAllianceEpaFromTeamData,
    REBUILT_AUTO_POINTS,
    DEFAULT_YEAR,
    AutonMatchRecord,
} from '../autonImportance';
import { TBAMatch } from '../tba';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMatch(overrides: Partial<TBAMatch & { event_key?: string; winning_alliance?: string }> = {}): TBAMatch & { event_key?: string; winning_alliance?: string } {
    return {
        key: '2026txcle_qm1',
        match_number: 1,
        comp_level: 'qm',
        alliances: {
            red: { score: 50, team_keys: ['frc1', 'frc2', 'frc3'] },
            blue: { score: 50, team_keys: ['frc4', 'frc5', 'frc6'] },
        },
        score_breakdown: {
            red: { autoPoints: 10 },
            blue: { autoPoints: 10 },
        },
        ...overrides,
    };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('constants', () => {
    it('DEFAULT_YEAR is 2026', () => {
        expect(DEFAULT_YEAR).toBe(2026);
    });

    it('REBUILT_AUTO_POINTS matches game manual values', () => {
        expect(REBUILT_AUTO_POINTS.fuel).toBe(1);
        expect(REBUILT_AUTO_POINTS.towerLevel1).toBe(15);
    });
});

// ---------------------------------------------------------------------------
// extractAutonScore — 2026 REBUILT scoring
// ---------------------------------------------------------------------------

describe('extractAutonScore', () => {
    it('returns 0 for null/undefined breakdown', () => {
        expect(extractAutonScore(null)).toBe(0);
        expect(extractAutonScore(undefined)).toBe(0);
    });

    it('uses autoPoints directly (primary TBA field for 2026 REBUILT)', () => {
        expect(extractAutonScore({ autoPoints: 25 })).toBe(25);
    });

    it('sums 2026 REBUILT sub-components when autoPoints is absent', () => {
        // 5 fuel × 1pt + Level1 tower × 15pt = 20
        expect(extractAutonScore({
            autoFuelPoints: 5,
            autoTowerPoints: 15,
        })).toBe(20);
    });

    it('handles partial 2026 sub-fields (missing fields default to 0)', () => {
        expect(extractAutonScore({ autoFuelPoints: 8 })).toBe(8);
        expect(extractAutonScore({ autoTowerPoints: 15 })).toBe(15);
    });

    it('falls back to summing any field starting with "auto" (generic catch-all)', () => {
        expect(extractAutonScore({ autoCoralPoints: 7, autoAlgaePoints: 3 })).toBe(10);
    });

    it('generic fallback excludes rp and bonus fields', () => {
        expect(extractAutonScore({ autoPoints: 0, autoRpBonus: 1 })).toBe(0);
    });

    it('returns 0 for empty breakdown', () => {
        expect(extractAutonScore({})).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// getMatchWinner
// ---------------------------------------------------------------------------

describe('getMatchWinner', () => {
    it('uses winning_alliance field when set to red', () => {
        const m = makeMatch({ winning_alliance: 'red' });
        expect(getMatchWinner(m)).toBe('red');
    });

    it('uses winning_alliance field when set to blue', () => {
        const m = makeMatch({ winning_alliance: 'blue' });
        expect(getMatchWinner(m)).toBe('blue');
    });

    it('falls back to score comparison when winning_alliance is empty string', () => {
        const m = makeMatch({
            winning_alliance: '',
            alliances: { red: { score: 60, team_keys: [] }, blue: { score: 50, team_keys: [] } },
        });
        expect(getMatchWinner(m)).toBe('red');
    });

    it('returns tie when scores are equal', () => {
        const m = makeMatch({
            winning_alliance: '',
            alliances: { red: { score: 55, team_keys: [] }, blue: { score: 55, team_keys: [] } },
        });
        expect(getMatchWinner(m)).toBe('tie');
    });
});

// ---------------------------------------------------------------------------
// processMatch
// ---------------------------------------------------------------------------

describe('processMatch', () => {
    it('returns null for unplayed match (score -1)', () => {
        const m = makeMatch({ alliances: { red: { score: -1, team_keys: [] }, blue: { score: -1, team_keys: [] } } });
        expect(processMatch(m, 2026)).toBeNull();
    });

    it('returns null when score_breakdown is missing', () => {
        const m = makeMatch({ score_breakdown: undefined });
        expect(processMatch(m, 2026)).toBeNull();
    });

    it('returns null when auton margin is 0', () => {
        const m = makeMatch({ score_breakdown: { red: { autoPoints: 10 }, blue: { autoPoints: 10 } } });
        expect(processMatch(m, 2026)).toBeNull();
    });

    it('returns null when auton margin is >1', () => {
        const m = makeMatch({ score_breakdown: { red: { autoPoints: 10 }, blue: { autoPoints: 15 } } });
        expect(processMatch(m, 2026)).toBeNull();
    });

    it('builds correct record when blue wins auton by 1 and wins overall', () => {
        const m = makeMatch({
            key: '2026txcle_qm5',
            winning_alliance: 'blue',
            alliances: {
                red: { score: 80, team_keys: ['frc1', 'frc2', 'frc3'] },
                blue: { score: 90, team_keys: ['frc4', 'frc5', 'frc6'] },
            },
            score_breakdown: { red: { autoPoints: 14 }, blue: { autoPoints: 15 } },
        });

        const rec = processMatch(m, 2026);
        expect(rec).not.toBeNull();
        expect(rec!.autonWinnerAlliance).toBe('blue');
        expect(rec!.autonBlue).toBe(15);
        expect(rec!.autonRed).toBe(14);
        expect(rec!.autonMargin).toBe(1);
        expect(rec!.matchResultForAutonWinner).toBe('win');
        expect(rec!.finalMargin).toBe(10);
        expect(rec!.year).toBe(2026);
    });

    it('builds correct record when red wins auton by 1 but blue wins overall', () => {
        const m = makeMatch({
            key: '2026txcle_qm6',
            winning_alliance: 'blue',
            alliances: {
                red: { score: 70, team_keys: [] },
                blue: { score: 85, team_keys: [] },
            },
            score_breakdown: { red: { autoPoints: 16 }, blue: { autoPoints: 15 } },
        });

        const rec = processMatch(m, 2026);
        expect(rec).not.toBeNull();
        expect(rec!.autonWinnerAlliance).toBe('red');
        expect(rec!.matchResultForAutonWinner).toBe('loss');
    });

    it('records a tie correctly', () => {
        const m = makeMatch({
            key: '2026txcle_qm7',
            winning_alliance: '',
            alliances: {
                red: { score: 60, team_keys: [] },
                blue: { score: 60, team_keys: [] },
            },
            score_breakdown: { red: { autoPoints: 10 }, blue: { autoPoints: 11 } },
        });

        const rec = processMatch(m, 2026);
        expect(rec).not.toBeNull();
        expect(rec!.matchResultForAutonWinner).toBe('tie');
    });

    it('attaches EPA data when provided', () => {
        const m = makeMatch({
            score_breakdown: { red: { autoPoints: 10 }, blue: { autoPoints: 11 } },
        });
        const rec = processMatch(m, 2026, { red: 42.5, blue: 38.2 });
        expect(rec!.epaRed).toBe(42.5);
        expect(rec!.epaBlue).toBe(38.2);
        expect(rec!.epaDiff).toBeCloseTo(-4.3);
    });

    it('derives eventKey from match key when event_key is absent', () => {
        const m = makeMatch({
            key: '2026txcle_qm99',
            event_key: undefined,
            score_breakdown: { red: { autoPoints: 10 }, blue: { autoPoints: 11 } },
        });
        const rec = processMatch(m, 2026);
        expect(rec).not.toBeNull();
        expect(rec!.eventKey).toBe('2026txcle');
    });

    it('extracts auton from 2026 REBUILT sub-components via extractAutonScore', () => {
        // 6 fuel (6pt) + tower L1 (15pt) = 21 for blue
        // 5 fuel (5pt) + tower L1 (15pt) = 20 for red  => margin = 1
        const m = makeMatch({
            key: '2026txcle_qm10',
            winning_alliance: 'blue',
            alliances: {
                red: { score: 75, team_keys: [] },
                blue: { score: 80, team_keys: [] },
            },
            score_breakdown: {
                red: { autoFuelPoints: 5, autoTowerPoints: 15 },
                blue: { autoFuelPoints: 6, autoTowerPoints: 15 },
            },
        });
        const rec = processMatch(m, 2026);
        expect(rec).not.toBeNull();
        expect(rec!.autonBlue).toBe(21);
        expect(rec!.autonRed).toBe(20);
        expect(rec!.autonWinnerAlliance).toBe('blue');
    });
});

// ---------------------------------------------------------------------------
// filterAutonByOneMargin
// ---------------------------------------------------------------------------

describe('filterAutonByOneMargin', () => {
    const matches: Array<TBAMatch & { winning_alliance?: string }> = [
        // qualifies: auton margin = 1 (blue)
        makeMatch({
            key: '2026ev_qm1',
            comp_level: 'qm',
            alliances: { red: { score: 50, team_keys: [] }, blue: { score: 60, team_keys: [] } },
            score_breakdown: { red: { autoPoints: 10 }, blue: { autoPoints: 11 } },
        }),
        // does not qualify: auton margin = 5
        makeMatch({
            key: '2026ev_qm2',
            comp_level: 'qm',
            alliances: { red: { score: 50, team_keys: [] }, blue: { score: 60, team_keys: [] } },
            score_breakdown: { red: { autoPoints: 10 }, blue: { autoPoints: 15 } },
        }),
        // qualifies: auton margin = -1 (red)
        makeMatch({
            key: '2026ev_sf1m1',
            comp_level: 'sf',
            alliances: { red: { score: 70, team_keys: [] }, blue: { score: 65, team_keys: [] } },
            score_breakdown: { red: { autoPoints: 11 }, blue: { autoPoints: 10 } },
        }),
    ];

    it('returns all qualifying matches when no filter is applied', () => {
        const records = filterAutonByOneMargin(matches, 2026);
        expect(records).toHaveLength(2);
    });

    it('filters by comp_level', () => {
        const records = filterAutonByOneMargin(matches, 2026, { compLevel: 'qm' });
        expect(records).toHaveLength(1);
        expect(records[0].matchKey).toBe('2026ev_qm1');
    });

    it('respects the limit option', () => {
        const records = filterAutonByOneMargin(matches, 2026, { limit: 1 });
        expect(records).toHaveLength(1);
    });
});

// ---------------------------------------------------------------------------
// buildSummary
// ---------------------------------------------------------------------------

describe('buildSummary', () => {
    it('returns zeroed summary for empty records', () => {
        const s = buildSummary([]);
        expect(s.totalMatches).toBe(0);
        expect(s.winPct).toBe(0);
    });

    it('computes correct win/loss/tie counts and percentages', () => {
        const base: Omit<AutonMatchRecord, 'matchResultForAutonWinner' | 'finalMargin' | 'autonWinnerAlliance'> = {
            matchKey: '2026ev_qm1',
            eventKey: '2026ev',
            compLevel: 'qm',
            year: 2026,
            autonBlue: 11,
            autonRed: 10,
            autonMargin: 1,
            finalScoreBlue: 60,
            finalScoreRed: 55,
        };

        const records: AutonMatchRecord[] = [
            { ...base, autonWinnerAlliance: 'blue', finalMargin: 5, matchResultForAutonWinner: 'win' },
            { ...base, autonWinnerAlliance: 'blue', finalMargin: 10, matchResultForAutonWinner: 'win' },
            { ...base, autonWinnerAlliance: 'red', finalMargin: 3, matchResultForAutonWinner: 'loss' },
            { ...base, autonWinnerAlliance: 'blue', finalMargin: 0, matchResultForAutonWinner: 'tie' },
        ];

        const s = buildSummary(records);
        expect(s.totalMatches).toBe(4);
        expect(s.wins).toBe(2);
        expect(s.losses).toBe(1);
        expect(s.ties).toBe(1);
        expect(s.winPct).toBeCloseTo(50);
        expect(s.lossPct).toBeCloseTo(25);
        expect(s.tiePct).toBeCloseTo(25);
    });

    it('builds finalMarginDistribution correctly', () => {
        const base: Omit<AutonMatchRecord, 'matchResultForAutonWinner' | 'finalMargin'> = {
            matchKey: '2026ev_qm1',
            eventKey: '2026ev',
            compLevel: 'qm',
            year: 2026,
            autonWinnerAlliance: 'blue',
            autonBlue: 11,
            autonRed: 10,
            autonMargin: 1,
            finalScoreBlue: 60,
            finalScoreRed: 55,
        };

        const records: AutonMatchRecord[] = [
            { ...base, finalMargin: 5, matchResultForAutonWinner: 'win' },
            { ...base, finalMargin: 5, matchResultForAutonWinner: 'win' },
            { ...base, finalMargin: -3, matchResultForAutonWinner: 'loss' },
        ];

        const s = buildSummary(records);
        expect(s.finalMarginDistribution[5]).toBe(2);
        expect(s.finalMarginDistribution[-3]).toBe(1);
    });
});

// ---------------------------------------------------------------------------
// buildAllianceEpaFromTeamData
// ---------------------------------------------------------------------------

describe('buildAllianceEpaFromTeamData', () => {
    const teamEvents = [
        { team: 254, epa: { total_points: { mean: 20.0, sd: 2.0 }, unitless: 1, norm: 1, conf: [], breakdown: { total_points: 20, auto_points: 5, teleop_points: 10, endgame_points: 5, auto_rp: 0, energized_rp: 0, supercharged_rp: 0, traversal_rp: 0 }, stats: { start: 0, pre_elim: 0, mean: 20, max: 25 } }, record: { qual: { wins: 5, losses: 2, ties: 0, count: 7, winrate: 0.71, rps: 14, rank: 2 }, total: { wins: 5, losses: 2, ties: 0, count: 7, winrate: 0.71 } }, team_name: 'Cheesy Poofs', event_name: 'Test', event: '2026ev', year: 2026, state: 'CA', country: 'USA', district: '', type: 'Regional', week: 1, status: 'Competed', first_event: false },
        { team: 1678, epa: { total_points: { mean: 18.5, sd: 1.5 }, unitless: 1, norm: 1, conf: [], breakdown: { total_points: 18.5, auto_points: 4, teleop_points: 10, endgame_points: 4.5, auto_rp: 0, energized_rp: 0, supercharged_rp: 0, traversal_rp: 0 }, stats: { start: 0, pre_elim: 0, mean: 18.5, max: 22 } }, record: { qual: { wins: 4, losses: 3, ties: 0, count: 7, winrate: 0.57, rps: 12, rank: 4 }, total: { wins: 4, losses: 3, ties: 0, count: 7, winrate: 0.57 } }, team_name: 'Citrus Circuits', event_name: 'Test', event: '2026ev', year: 2026, state: 'CA', country: 'USA', district: '', type: 'Regional', week: 1, status: 'Competed', first_event: false },
        { team: 118, epa: { total_points: { mean: 22.0, sd: 2.5 }, unitless: 1, norm: 1, conf: [], breakdown: { total_points: 22, auto_points: 6, teleop_points: 12, endgame_points: 4, auto_rp: 0, energized_rp: 0, supercharged_rp: 0, traversal_rp: 0 }, stats: { start: 0, pre_elim: 0, mean: 22, max: 28 } }, record: { qual: { wins: 6, losses: 1, ties: 0, count: 7, winrate: 0.86, rps: 16, rank: 1 }, total: { wins: 6, losses: 1, ties: 0, count: 7, winrate: 0.86 } }, team_name: 'Robonauts', event_name: 'Test', event: '2026ev', year: 2026, state: 'TX', country: 'USA', district: '', type: 'Regional', week: 1, status: 'Competed', first_event: false },
    ] as any[];

    it('sums team EPAs for red and blue alliances', () => {
        // red: 254 (20) + 1678 (18.5) + 973 (not found = 0) = 38.5
        // blue: 118 (22) + 2056 (not found = 0) + 4 (not found = 0) = 22
        const result = buildAllianceEpaFromTeamData(
            teamEvents,
            ['frc254', 'frc1678', 'frc973'],
            ['frc118', 'frc2056', 'frc4']
        );
        expect(result.red).toBeCloseTo(38.5);
        expect(result.blue).toBeCloseTo(22.0);
    });

    it('returns zero for both alliances when no team data matches', () => {
        const result = buildAllianceEpaFromTeamData(
            teamEvents,
            ['frc9999', 'frc8888'],
            ['frc7777', 'frc6666']
        );
        expect(result.red).toBe(0);
        expect(result.blue).toBe(0);
    });

    it('returns zero for empty team events array', () => {
        const result = buildAllianceEpaFromTeamData([], ['frc254'], ['frc118']);
        expect(result.red).toBe(0);
        expect(result.blue).toBe(0);
    });

    it('sums three teams per alliance when all are present', () => {
        // red: 254 (20) + 1678 (18.5) + 118 (22) = 60.5
        const result = buildAllianceEpaFromTeamData(
            teamEvents,
            ['frc254', 'frc1678', 'frc118'],
            ['frc254', 'frc1678', 'frc118']
        );
        expect(result.red).toBeCloseTo(60.5);
        expect(result.blue).toBeCloseTo(60.5);
    });
});
