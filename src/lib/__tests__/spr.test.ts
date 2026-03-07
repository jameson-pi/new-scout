import { calculateSPR, calculateTeamEPA, ScouterStats } from '../spr';
import type { ScoutReport, TBAMatchResult, RebuiltData } from '../spr';

// Helper to create mock scout report (REBUILT 2026)
function createMockReport(
    scoutId: string,
    matchKey: string,
    teamKey: string,
    alliance: 'red' | 'blue',
    overrides: Partial<{
        autoFuel: number;
        teleopFuel: number;
        autoTower: 'None' | 'Level1';
        teleopTower: 'None' | 'Level1' | 'Level2' | 'Level3';
        moved: boolean;
    }> = {}
): ScoutReport {
    const data: RebuiltData = {
        auto: {
            fuel_scored: overrides.autoFuel ?? 10,
            tower_level: overrides.autoTower ?? 'None',
            moved: overrides.moved ?? true,
        },
        teleop: {
            fuel_scored: overrides.teleopFuel ?? 20,
            tower_level: overrides.teleopTower ?? 'Level1',
        },
    };

    return { scoutId, matchKey, teamKey, alliance, data };
}

// Helper to create mock TBA match result
function createMockTBAMatch(
    matchKey: string,
    redScore: number = 100,
    blueScore: number = 90
): TBAMatchResult {
    return {
        matchKey,
        alliances: {
            red: {
                score: redScore,
                autoPoints: 30,
                teleopPoints: 50,
                endgamePoints: 20,
            },
            blue: {
                score: blueScore,
                autoPoints: 25,
                teleopPoints: 45,
                endgamePoints: 20,
            },
        },
    };
}

describe('spr', () => {
    describe('calculateSPR', () => {
        it('should return empty array for empty reports', () => {
            const result = calculateSPR([], {});
            expect(result).toEqual([]);
        });

        it('should calculate stats for scouts', () => {
            const reports: ScoutReport[] = [
                // QM1 Red Alliance
                createMockReport('scout1', '2026txcle_qm1', 'frc254', 'red'),
                createMockReport('scout2', '2026txcle_qm1', 'frc1678', 'red'),
                createMockReport('scout3', '2026txcle_qm1', 'frc973', 'red'),
                // QM2 Red Alliance
                createMockReport('scout1', '2026txcle_qm2', 'frc254', 'red'),
                createMockReport('scout2', '2026txcle_qm2', 'frc118', 'red'),
                createMockReport('scout3', '2026txcle_qm2', 'frc148', 'red'),
            ];
            const tbaMatches: Record<string, TBAMatchResult> = {
                '2026txcle_qm1': createMockTBAMatch('2026txcle_qm1'),
                '2026txcle_qm2': createMockTBAMatch('2026txcle_qm2'),
            };

            const result = calculateSPR(reports, tbaMatches);

            expect(result.length).toBeGreaterThan(0);
            result.forEach(scouterStats => {
                expect(scouterStats.scoutId).toBeDefined();
                expect(scouterStats.matchesScouted).toBeGreaterThan(0);
                expect(typeof scouterStats.avgError).toBe('number');
                expect(typeof scouterStats.variance).toBe('number');
                expect(typeof scouterStats.bias).toBe('number');
                expect(typeof scouterStats.spr).toBe('number');
            });
        });

        it('should count matches scouted correctly', () => {
            const reports: ScoutReport[] = [
                // QM1 Red (Scout 1)
                createMockReport('scout1', '2026txcle_qm1', 'frc254', 'red'),
                createMockReport('other', '2026txcle_qm1', 'frc1', 'red'),
                createMockReport('other', '2026txcle_qm1', 'frc2', 'red'),
                // QM2 Red (Scout 1)
                createMockReport('scout1', '2026txcle_qm2', 'frc254', 'red'),
                createMockReport('other', '2026txcle_qm2', 'frc1', 'red'),
                createMockReport('other', '2026txcle_qm2', 'frc2', 'red'),
                // QM3 Red (Scout 1)
                createMockReport('scout1', '2026txcle_qm3', 'frc254', 'red'),
                createMockReport('other', '2026txcle_qm3', 'frc1', 'red'),
                createMockReport('other', '2026txcle_qm3', 'frc2', 'red'),

                // QM1 Blue (Scout 2)
                createMockReport('scout2', '2026txcle_qm1', 'frc1678', 'blue'),
                createMockReport('other', '2026txcle_qm1', 'frc3', 'blue'),
                createMockReport('other', '2026txcle_qm1', 'frc4', 'blue'),
            ];
            const tbaMatches: Record<string, TBAMatchResult> = {
                '2026txcle_qm1': createMockTBAMatch('2026txcle_qm1'),
                '2026txcle_qm2': createMockTBAMatch('2026txcle_qm2'),
                '2026txcle_qm3': createMockTBAMatch('2026txcle_qm3'),
            };

            const result = calculateSPR(reports, tbaMatches);

            const scout1 = result.find(s => s.scoutId === 'scout1');
            const scout2 = result.find(s => s.scoutId === 'scout2');
            expect(scout1?.matchesScouted).toBe(3);
            expect(scout2?.matchesScouted).toBe(1);
        });

        it('should calculate error metrics', () => {
            const reports: ScoutReport[] = [
                createMockReport('scout1', '2026txcle_qm1', 'frc254', 'red'),
                createMockReport('other', '2026txcle_qm1', 'frc1', 'red'),
                createMockReport('other', '2026txcle_qm1', 'frc2', 'red'),
            ];
            const tbaMatches: Record<string, TBAMatchResult> = {
                '2026txcle_qm1': createMockTBAMatch('2026txcle_qm1', 100, 80),
            };

            const result = calculateSPR(reports, tbaMatches);

            const scout1 = result.find(s => s.scoutId === 'scout1');
            expect(scout1?.autoError).toBeDefined();
            expect(scout1?.teleError).toBeDefined();
            expect(scout1?.endgameError).toBeDefined();
        });

        it('should calculate SPR score', () => {
            const reports: ScoutReport[] = [
                createMockReport('scout1', '2026txcle_qm1', 'frc254', 'red'),
                createMockReport('other', '2026txcle_qm1', 'frc1', 'red'),
                createMockReport('other', '2026txcle_qm1', 'frc2', 'red'),
            ];
            const tbaMatches: Record<string, TBAMatchResult> = {
                '2026txcle_qm1': createMockTBAMatch('2026txcle_qm1'),
            };

            const result = calculateSPR(reports, tbaMatches);

            result.forEach(scout => {
                // SPR should be a positive number
                expect(scout.spr).toBeGreaterThanOrEqual(0);
            });
        });

        it('should skip reports without matching TBA data', () => {
            const reports: ScoutReport[] = [
                // Valid match
                createMockReport('scout1', '2026txcle_qm1', 'frc254', 'red'),
                createMockReport('other', '2026txcle_qm1', 'frc1', 'red'),
                createMockReport('other', '2026txcle_qm1', 'frc2', 'red'),
                // Invalid match (no TBA data)
                createMockReport('scout1', '2026txcle_qm99', 'frc254', 'red'),
                createMockReport('other', '2026txcle_qm99', 'frc1', 'red'),
                createMockReport('other', '2026txcle_qm99', 'frc2', 'red'),
            ];
            const tbaMatches: Record<string, TBAMatchResult> = {
                '2026txcle_qm1': createMockTBAMatch('2026txcle_qm1'),
            };

            const result = calculateSPR(reports, tbaMatches);

            // Should still process scout1's valid match
            expect(result.length).toBeGreaterThan(0);
        });
    });

    describe('calculateTeamEPA', () => {
        it('should return 0 for empty reports', () => {
            const result = calculateTeamEPA([]);
            expect(result).toBe(0);
        });

        it('should calculate EPA based on scoring', () => {
            const reports: ScoutReport[] = [
                createMockReport('scout1', '2026txcle_qm1', 'frc254', 'red', { autoFuel: 15, teleopFuel: 30 }),
                createMockReport('scout1', '2026txcle_qm2', 'frc254', 'red', { autoFuel: 10, teleopFuel: 25 }),
            ];

            const result = calculateTeamEPA(reports);

            expect(result).toBeGreaterThan(0);
        });

        it('should weight higher scores more', () => {
            const lowScoreReports: ScoutReport[] = [
                createMockReport('scout1', '2026txcle_qm1', 'frc254', 'red', { autoFuel: 2, teleopFuel: 5 }),
                createMockReport('scout1', '2026txcle_qm2', 'frc254', 'red', { autoFuel: 2, teleopFuel: 5 }),
            ];

            const highScoreReports: ScoutReport[] = [
                createMockReport('scout1', '2026txcle_qm1', 'frc254', 'red', { autoFuel: 20, teleopFuel: 50 }),
                createMockReport('scout1', '2026txcle_qm2', 'frc254', 'red', { autoFuel: 20, teleopFuel: 50 }),
            ];

            const lowEPA = calculateTeamEPA(lowScoreReports);
            const highEPA = calculateTeamEPA(highScoreReports);

            expect(highEPA).toBeGreaterThan(lowEPA);
        });

        it('should include all scoring components', () => {
            // Team with only fuel scoring
            const fuelOnly: ScoutReport[] = [
                createMockReport('scout1', '2026txcle_qm1', 'frc254', 'red', { autoFuel: 15, teleopFuel: 30, teleopTower: 'None' }),
            ];

            // Same fuel but with tower climb
            const withTower: ScoutReport[] = [
                createMockReport('scout1', '2026txcle_qm1', 'frc254', 'red', { autoFuel: 15, teleopFuel: 30, teleopTower: 'Level3' }),
            ];

            const fuelEPA = calculateTeamEPA(fuelOnly);
            const towerEPA = calculateTeamEPA(withTower);

            expect(towerEPA).toBeGreaterThan(fuelEPA);
        });

        it('should average across multiple matches', () => {
            const reports: ScoutReport[] = [
                createMockReport('scout1', '2026txcle_qm1', 'frc254', 'red', { teleopFuel: 50 }),
                createMockReport('scout1', '2026txcle_qm2', 'frc254', 'red', { teleopFuel: 0 }),
            ];

            const result = calculateTeamEPA(reports);

            const highReports = [createMockReport('scout1', '2026txcle_qm1', 'frc254', 'red', { teleopFuel: 50 })];
            const lowReports = [createMockReport('scout1', '2026txcle_qm1', 'frc254', 'red', { teleopFuel: 0 })];

            const highEPA = calculateTeamEPA(highReports);
            const lowEPA = calculateTeamEPA(lowReports);

            expect(result).toBeGreaterThan(lowEPA);
            expect(result).toBeLessThan(highEPA);
        });
    });
});
