import {
    analyzeDefenseProfile,
    generateMatchupMatrix,
    DefenseProfile,
    MatchupResult
} from '../defense';
import { ScoutReport, RebuiltData } from '../spr';

// Helper to create mock scout reports (REBUILT 2026)
function createMockReport(
    teamKey: string,
    defenderRating: number = 0,
    teleopFuel: number = 20
): ScoutReport {
    const data: RebuiltData = {
        auto: {
            fuel_scored: 10,
            tower_level: 'None',
            moved: true,
        },
        teleop: {
            fuel_scored: teleopFuel,
            tower_level: 'Level1',
        },
        defender_rating: defenderRating,
    };

    return {
        scoutId: 'scout1',
        matchKey: '2026txcle_qm1',
        teamKey,
        alliance: 'red',
        data,
    };
}

describe('defense', () => {
    describe('analyzeDefenseProfile', () => {
        it('should return default values for empty reports', () => {
            const result = analyzeDefenseProfile([]);

            expect(result.teamKey).toBe('');
            expect(result.defenseRating).toBe(0);
            expect(result.isDefender).toBe(false);
            expect(result.effectivenessVsHub).toBe(0);
            expect(result.effectivenessVsTower).toBe(0);
            expect(result.gamesDefended).toBe(0);
        });

        it('should identify non-defender with low rating', () => {
            const reports: ScoutReport[] = [
                createMockReport('frc254', 1),
                createMockReport('frc254', 1),
                createMockReport('frc254', 1),
            ];

            const result = analyzeDefenseProfile(reports);

            expect(result.teamKey).toBe('frc254');
            expect(result.defenseRating).toBe(1);
            expect(result.isDefender).toBe(false);
        });

        it('should identify defender with high rating', () => {
            const reports: ScoutReport[] = [
                createMockReport('frc254', 4),
                createMockReport('frc254', 4),
                createMockReport('frc254', 5),
            ];

            const result = analyzeDefenseProfile(reports);

            expect(result.defenseRating).toBeCloseTo(4.33, 1);
            expect(result.isDefender).toBe(true);
        });

        it('should calculate games defended correctly', () => {
            const reports: ScoutReport[] = [
                createMockReport('frc254', 3),
                createMockReport('frc254', 4),
                createMockReport('frc254', 1),
                createMockReport('frc254', 0),
            ];

            const result = analyzeDefenseProfile(reports);

            expect(result.gamesDefended).toBe(2);
        });

        it('should calculate effectiveness based on rating', () => {
            const reports: ScoutReport[] = [
                createMockReport('frc254', 5),
                createMockReport('frc254', 5),
            ];

            const result = analyzeDefenseProfile(reports);

            // effectivenessVsHub = min(100, rating * 15) = min(100, 5*15) = 75
            expect(result.effectivenessVsHub).toBe(75);
            // effectivenessVsTower = min(100, rating * 20) = min(100, 5*20) = 100
            expect(result.effectivenessVsTower).toBe(100);
        });

        it('should cap effectiveness at 100', () => {
            const reports: ScoutReport[] = [
                createMockReport('frc254', 5),
                createMockReport('frc254', 5),
                createMockReport('frc254', 5),
            ];

            const result = analyzeDefenseProfile(reports);

            expect(result.effectivenessVsHub).toBeLessThanOrEqual(100);
            expect(result.effectivenessVsTower).toBeLessThanOrEqual(100);
        });
    });

    describe('generateMatchupMatrix', () => {
        it('should return empty array when no defenders', () => {
            const reports: ScoutReport[] = [
                createMockReport('frc254', 1),
                createMockReport('frc1678', 0),
            ];

            const result = generateMatchupMatrix(reports);

            expect(result).toHaveLength(0);
        });

        it('should generate matchups for defenders vs offense teams', () => {
            const reports: ScoutReport[] = [
                createMockReport('frc254', 4, 20),
                createMockReport('frc254', 4, 20),
                createMockReport('frc1678', 0, 40),
                createMockReport('frc1678', 0, 40),
                createMockReport('frc973', 0, 10),
                createMockReport('frc973', 0, 10),
            ];

            const result = generateMatchupMatrix(reports);

            expect(result.length).toBeGreaterThan(0);
            expect(result.filter(m => m.defenderTeam === 'frc254').length).toBe(2);
        });

        it('should not include self-matchups', () => {
            const reports: ScoutReport[] = [
                createMockReport('frc254', 4),
                createMockReport('frc254', 4),
            ];

            const result = generateMatchupMatrix(reports);

            const selfMatchups = result.filter(m => m.defenderTeam === m.offenseTeam);
            expect(selfMatchups).toHaveLength(0);
        });

        it('should classify effectiveness correctly', () => {
            const reports: ScoutReport[] = [
                createMockReport('frc254', 5),
                createMockReport('frc254', 5),
                createMockReport('frc1678', 0, 30),
                createMockReport('frc1678', 0, 30),
            ];

            const result = generateMatchupMatrix(reports);

            const matchup = result.find(m => m.offenseTeam === 'frc1678');
            expect(matchup?.effectiveness).toBe('high');
        });

        it('should sort by score delta descending', () => {
            const reports: ScoutReport[] = [
                createMockReport('frc254', 4),
                createMockReport('frc254', 4),
                createMockReport('frc1678', 0, 50),
                createMockReport('frc1678', 0, 50),
                createMockReport('frc973', 0, 10),
                createMockReport('frc973', 0, 10),
            ];

            const result = generateMatchupMatrix(reports);

            if (result.length >= 2) {
                expect(result[0].scoreDelta).toBeGreaterThanOrEqual(result[1].scoreDelta);
            }
        });
    });
});
