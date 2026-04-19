/**
 * Unit tests for autonImportance.ts
 *
 * Tests cover:
 *  - extractAutonScore  (breakdown field extraction for multiple seasons)
 *  - getMatchWinner     (winning alliance determination)
 *  - processMatch       (full record construction + filtering)
 *  - filterAutonByOneMargin (batch filtering with comp_level / limit)
 *  - buildSummary       (aggregation)
 *  - buildEpaLookup     (Statbotics EPA lookup)
 */

import {
    extractAutonScore,
    getMatchWinner,
    processMatch,
    filterAutonByOneMargin,
    buildSummary,
    buildEpaLookup,
    TBAMatch,
    TBAScoreBreakdown,
    StatboticsMatch,
} from '../autonImportance';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMatch(overrides: Partial<TBAMatch> = {}): TBAMatch {
    return {
        key: '2024txcle_qm1',
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
// extractAutonScore
// ---------------------------------------------------------------------------

describe('extractAutonScore', () => {
    it('returns 0 for null/undefined breakdown', () => {
        expect(extractAutonScore(null)).toBe(0);
        expect(extractAutonScore(undefined)).toBe(0);
    });

    it('uses autoPoints when present', () => {
        const bd: TBAScoreBreakdown = { autoPoints: 25 };
        expect(extractAutonScore(bd)).toBe(25);
    });

    it('handles 2024 Crescendo fields when autoPoints is absent', () => {
        const bd: TBAScoreBreakdown = {
            autoAmpNotePoints: 5,
            autoSpeakerNotePoints: 10,
            autoLeavePoints: 3,
        };
        expect(extractAutonScore(bd)).toBe(18);
    });

    it('handles 2023 Charged Up fields', () => {
        const bd: TBAScoreBreakdown = {
            autoMobilityPoints: 6,
            autoChargeStationPoints: 12,
        };
        expect(extractAutonScore(bd)).toBe(18);
    });

    it('handles 2022 Rapid React taxi + cargo', () => {
        const bd: TBAScoreBreakdown = {
            taxiPoints: 4,
            cargoPoints: 8,
        };
        expect(extractAutonScore(bd)).toBe(12);
    });

    it('handles 2020/2021 Infinite Recharge fields', () => {
        const bd: TBAScoreBreakdown = {
            autoInitLinePoints: 5,
            autoCellPoints: 10,
        };
        expect(extractAutonScore(bd)).toBe(15);
    });

    it('falls back to summing any field starting with "auto"', () => {
        const bd: TBAScoreBreakdown = {
            autoCoralPoints: 7,
            autoAlgaePoints: 3,
        };
        expect(extractAutonScore(bd)).toBe(10);
    });

    it('returns 0 for empty breakdown object', () => {
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
            alliances: {
                red: { score: 60, team_keys: [] },
                blue: { score: 50, team_keys: [] },
            },
        });
        expect(getMatchWinner(m)).toBe('red');
    });

    it('returns tie when scores are equal', () => {
        const m = makeMatch({
            winning_alliance: '',
            alliances: {
                red: { score: 55, team_keys: [] },
                blue: { score: 55, team_keys: [] },
            },
        });
        expect(getMatchWinner(m)).toBe('tie');
    });
});

// ---------------------------------------------------------------------------
// processMatch
// ---------------------------------------------------------------------------

describe('processMatch', () => {
    it('returns null for unplayed match (score -1)', () => {
        const m = makeMatch({
            alliances: {
                red: { score: -1, team_keys: [] },
                blue: { score: -1, team_keys: [] },
            },
        });
        expect(processMatch(m, 2024)).toBeNull();
    });

    it('returns null when score_breakdown is missing', () => {
        const m = makeMatch({ score_breakdown: undefined });
        expect(processMatch(m, 2024)).toBeNull();
    });

    it('returns null when auton margin is 0', () => {
        const m = makeMatch({
            score_breakdown: {
                red: { autoPoints: 10 },
                blue: { autoPoints: 10 },
            },
        });
        expect(processMatch(m, 2024)).toBeNull();
    });

    it('returns null when auton margin is >1', () => {
        const m = makeMatch({
            score_breakdown: {
                red: { autoPoints: 10 },
                blue: { autoPoints: 15 },
            },
        });
        expect(processMatch(m, 2024)).toBeNull();
    });

    it('builds correct record when blue wins auton by 1 and wins overall', () => {
        const m = makeMatch({
            key: '2024txcle_qm5',
            winning_alliance: 'blue',
            alliances: {
                red: { score: 80, team_keys: ['frc1', 'frc2', 'frc3'] },
                blue: { score: 90, team_keys: ['frc4', 'frc5', 'frc6'] },
            },
            score_breakdown: {
                red: { autoPoints: 14 },
                blue: { autoPoints: 15 },
            },
        });

        const rec = processMatch(m, 2024);
        expect(rec).not.toBeNull();
        expect(rec!.autonWinnerAlliance).toBe('blue');
        expect(rec!.autonBlue).toBe(15);
        expect(rec!.autonRed).toBe(14);
        expect(rec!.autonMargin).toBe(1);
        expect(rec!.matchResultForAutonWinner).toBe('win');
        expect(rec!.finalMargin).toBe(10); // blue 90 - red 80
    });

    it('builds correct record when red wins auton by 1 but blue wins overall', () => {
        const m = makeMatch({
            key: '2024txcle_qm6',
            winning_alliance: 'blue',
            alliances: {
                red: { score: 70, team_keys: [] },
                blue: { score: 85, team_keys: [] },
            },
            score_breakdown: {
                red: { autoPoints: 16 },
                blue: { autoPoints: 15 },
            },
        });

        const rec = processMatch(m, 2024);
        expect(rec).not.toBeNull();
        expect(rec!.autonWinnerAlliance).toBe('red');
        expect(rec!.matchResultForAutonWinner).toBe('loss');
    });

    it('records a tie correctly', () => {
        const m = makeMatch({
            key: '2024txcle_qm7',
            winning_alliance: '',
            alliances: {
                red: { score: 60, team_keys: [] },
                blue: { score: 60, team_keys: [] },
            },
            score_breakdown: {
                red: { autoPoints: 10 },
                blue: { autoPoints: 11 },
            },
        });

        const rec = processMatch(m, 2024);
        expect(rec).not.toBeNull();
        expect(rec!.matchResultForAutonWinner).toBe('tie');
    });

    it('attaches EPA data when provided', () => {
        const m = makeMatch({
            score_breakdown: {
                red: { autoPoints: 10 },
                blue: { autoPoints: 11 },
            },
        });
        const rec = processMatch(m, 2024, { red: 42.5, blue: 38.2 });
        expect(rec!.epaRed).toBe(42.5);
        expect(rec!.epaBlue).toBe(38.2);
        expect(rec!.epaDiff).toBeCloseTo(-4.3);
    });

    it('derives eventKey from match key when event_key is absent', () => {
        const m = makeMatch({
            key: '2024txcle_qm99',
            event_key: undefined,
            score_breakdown: { red: { autoPoints: 10 }, blue: { autoPoints: 11 } },
        });
        const rec = processMatch(m, 2024);
        expect(rec).not.toBeNull();
        expect(rec!.eventKey).toBe('2024txcle');
    });
});

// ---------------------------------------------------------------------------
// filterAutonByOneMargin
// ---------------------------------------------------------------------------

describe('filterAutonByOneMargin', () => {
    const matches: TBAMatch[] = [
        // qualifies: auton margin = 1 (blue)
        makeMatch({
            key: '2024ev_qm1',
            comp_level: 'qm',
            alliances: { red: { score: 50, team_keys: [] }, blue: { score: 60, team_keys: [] } },
            score_breakdown: { red: { autoPoints: 10 }, blue: { autoPoints: 11 } },
        }),
        // does not qualify: auton margin = 5
        makeMatch({
            key: '2024ev_qm2',
            comp_level: 'qm',
            alliances: { red: { score: 50, team_keys: [] }, blue: { score: 60, team_keys: [] } },
            score_breakdown: { red: { autoPoints: 10 }, blue: { autoPoints: 15 } },
        }),
        // qualifies: auton margin = -1 (red)
        makeMatch({
            key: '2024ev_sf1m1',
            comp_level: 'sf',
            alliances: { red: { score: 70, team_keys: [] }, blue: { score: 65, team_keys: [] } },
            score_breakdown: { red: { autoPoints: 11 }, blue: { autoPoints: 10 } },
        }),
    ];

    it('returns all qualifying matches when no filter is applied', () => {
        const records = filterAutonByOneMargin(matches, 2024);
        expect(records).toHaveLength(2);
    });

    it('filters by comp_level', () => {
        const records = filterAutonByOneMargin(matches, 2024, { compLevel: 'qm' });
        expect(records).toHaveLength(1);
        expect(records[0].matchKey).toBe('2024ev_qm1');
    });

    it('respects the limit option', () => {
        const records = filterAutonByOneMargin(matches, 2024, { limit: 1 });
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
        const records = [
            { ...makeMatch(), matchResultForAutonWinner: 'win' as const, autonWinnerAlliance: 'blue' as const, finalMargin: 5 },
            { ...makeMatch(), matchResultForAutonWinner: 'win' as const, autonWinnerAlliance: 'blue' as const, finalMargin: 10 },
            { ...makeMatch(), matchResultForAutonWinner: 'loss' as const, autonWinnerAlliance: 'red' as const, finalMargin: 3 },
            { ...makeMatch(), matchResultForAutonWinner: 'tie' as const, autonWinnerAlliance: 'blue' as const, finalMargin: 0 },
        ].map((r) => ({
            matchKey: r.key,
            eventKey: '2024ev',
            compLevel: 'qm',
            year: 2024,
            autonWinnerAlliance: r.autonWinnerAlliance,
            autonBlue: 11,
            autonRed: 10,
            autonMargin: 1 as const,
            finalScoreBlue: 60,
            finalScoreRed: 55,
            finalMargin: r.finalMargin,
            matchResultForAutonWinner: r.matchResultForAutonWinner,
        }));

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
        const records = [5, 5, -3].map((margin) => ({
            matchKey: '2024ev_qm1',
            eventKey: '2024ev',
            compLevel: 'qm',
            year: 2024,
            autonWinnerAlliance: 'blue' as const,
            autonBlue: 11,
            autonRed: 10,
            autonMargin: 1 as const,
            finalScoreBlue: 60,
            finalScoreRed: 55,
            finalMargin: margin,
            matchResultForAutonWinner: (margin > 0 ? 'win' : 'loss') as 'win' | 'loss',
        }));

        const s = buildSummary(records);
        expect(s.finalMarginDistribution[5]).toBe(2);
        expect(s.finalMarginDistribution[-3]).toBe(1);
    });
});

// ---------------------------------------------------------------------------
// buildEpaLookup
// ---------------------------------------------------------------------------

describe('buildEpaLookup', () => {
    it('builds a lookup map from Statbotics match data', () => {
        const sbMatches: StatboticsMatch[] = [
            { key: '2024ev_qm1', event: '2024ev', red_epa_sum: 42.1, blue_epa_sum: 38.5 },
            { key: '2024ev_qm2', event: '2024ev', red_epa_sum: 30.0, blue_epa_sum: 35.0 },
        ];
        const lookup = buildEpaLookup(sbMatches);
        expect(lookup.get('2024ev_qm1')).toEqual({ red: 42.1, blue: 38.5 });
        expect(lookup.get('2024ev_qm2')).toEqual({ red: 30.0, blue: 35.0 });
    });

    it('returns empty map for empty input', () => {
        expect(buildEpaLookup([]).size).toBe(0);
    });

    it('handles missing epa sum fields gracefully (falls back to 0)', () => {
        const sbMatches: StatboticsMatch[] = [
            { key: '2024ev_qm3', event: '2024ev' },
        ];
        const lookup = buildEpaLookup(sbMatches);
        expect(lookup.get('2024ev_qm3')).toEqual({ red: 0, blue: 0 });
    });
});
