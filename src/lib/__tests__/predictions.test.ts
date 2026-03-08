import {
    predictMatch,
    predictUpcomingMatches,
    MatchPrediction
} from '../predictions';
import { SimulatedMatch, TeamPerformanceDistribution } from '../simulation';
import { RebuiltData } from '../spr';

// Helper to create mock performance distribution (REBUILT 2026)
function createMockDistribution(
    teamKey: string,
    avgScore: number = 50
): TeamPerformanceDistribution {
    // Create performance data that roughly averages to the target score
    const fuelCount = Math.floor(avgScore * 0.7);
    const pastMatches: RebuiltData[] = [{
        auto: {
            fuel_scored: Math.floor(fuelCount * 0.3),
            climb_level: 'No Attempt' as const,
            moved: true,
        },
        teleop: {
            fuel_scored: Math.floor(fuelCount * 0.7),
            climb_level: avgScore > 40 ? 'Level2' as const : 'Level1' as const,
        },
    }];

    return {
        teamKey,
        pastSyntheticMatches: pastMatches,
    };
}

describe('predictions', () => {
    describe('predictMatch', () => {
        it('should return prediction with all required fields', () => {
            const match: SimulatedMatch = {
                matchKey: '2026txcle_qm1',
                red: ['frc254', 'frc1678', 'frc973'],
                blue: ['frc118', 'frc148', 'frc2056'],
            };
            const distributions: TeamPerformanceDistribution[] = [
                createMockDistribution('frc254'),
                createMockDistribution('frc1678'),
                createMockDistribution('frc973'),
                createMockDistribution('frc118'),
                createMockDistribution('frc148'),
                createMockDistribution('frc2056'),
            ];

            const result = predictMatch(match, distributions);

            expect(result.matchKey).toBe('2026txcle_qm1');
            expect(result.redTeams).toEqual(['frc254', 'frc1678', 'frc973']);
            expect(result.blueTeams).toEqual(['frc118', 'frc148', 'frc2056']);
            expect(result.redWinProbability).toBeGreaterThanOrEqual(0);
            expect(result.redWinProbability).toBeLessThanOrEqual(1);
            expect(result.blueWinProbability).toBeGreaterThanOrEqual(0);
            expect(result.blueWinProbability).toBeLessThanOrEqual(1);
            expect(result.tieProbability).toBeGreaterThanOrEqual(0);
            expect(['red', 'blue', 'tie']).toContain(result.predictedWinner);
            expect(['high', 'medium', 'low']).toContain(result.confidence);
        });

        it('should have probabilities summing to 1', () => {
            const match: SimulatedMatch = {
                matchKey: '2026txcle_qm1',
                red: ['frc254', 'frc1678', 'frc973'],
                blue: ['frc118', 'frc148', 'frc2056'],
            };
            const distributions: TeamPerformanceDistribution[] = [
                createMockDistribution('frc254'),
                createMockDistribution('frc1678'),
                createMockDistribution('frc973'),
                createMockDistribution('frc118'),
                createMockDistribution('frc148'),
                createMockDistribution('frc2056'),
            ];

            const result = predictMatch(match, distributions);

            const sum = result.redWinProbability + result.blueWinProbability + result.tieProbability;
            expect(sum).toBeCloseTo(1, 5);
        });

        it('should favor stronger alliance', () => {
            const match: SimulatedMatch = {
                matchKey: '2026txcle_qm1',
                red: ['frc254', 'frc1678', 'frc973'],
                blue: ['frc100', 'frc101', 'frc102'],
            };
            const distributions: TeamPerformanceDistribution[] = [
                createMockDistribution('frc254', 80),  // Strong
                createMockDistribution('frc1678', 70), // Strong
                createMockDistribution('frc973', 60),  // Strong
                createMockDistribution('frc100', 20),  // Weak
                createMockDistribution('frc101', 15),  // Weak
                createMockDistribution('frc102', 10),  // Weak
            ];

            const result = predictMatch(match, distributions);

            expect(result.redWinProbability).toBeGreaterThan(result.blueWinProbability);
            expect(result.predictedWinner).toBe('red');
        });

        it('should calculate score ranges', () => {
            const match: SimulatedMatch = {
                matchKey: '2026txcle_qm1',
                red: ['frc254', 'frc1678', 'frc973'],
                blue: ['frc118', 'frc148', 'frc2056'],
            };
            const distributions: TeamPerformanceDistribution[] = [
                createMockDistribution('frc254'),
                createMockDistribution('frc1678'),
                createMockDistribution('frc973'),
                createMockDistribution('frc118'),
                createMockDistribution('frc148'),
                createMockDistribution('frc2056'),
            ];

            const result = predictMatch(match, distributions);

            expect(result.redScoreRange.min).toBeLessThanOrEqual(result.redScoreRange.mean);
            expect(result.redScoreRange.mean).toBeLessThanOrEqual(result.redScoreRange.max);
            expect(result.blueScoreRange.min).toBeLessThanOrEqual(result.blueScoreRange.mean);
            expect(result.blueScoreRange.mean).toBeLessThanOrEqual(result.blueScoreRange.max);
        });

        it('should assign confidence based on win probability', () => {
            const match: SimulatedMatch = {
                matchKey: '2026txcle_qm1',
                red: ['frc254', 'frc1678', 'frc973'],
                blue: ['frc100', 'frc101', 'frc102'],
            };
            const distributions: TeamPerformanceDistribution[] = [
                createMockDistribution('frc254', 100),
                createMockDistribution('frc1678', 100),
                createMockDistribution('frc973', 100),
                createMockDistribution('frc100', 5),
                createMockDistribution('frc101', 5),
                createMockDistribution('frc102', 5),
            ];

            const result = predictMatch(match, distributions);

            // With such a mismatch, confidence should be high
            expect(result.confidence).toBe('high');
        });
    });

    describe('predictUpcomingMatches', () => {
        it('should filter matches based on currentMatchLimit', () => {
            const matches: SimulatedMatch[] = [
                { matchKey: '2026txcle_qm1', red: ['frc254'], blue: ['frc118'] },
                { matchKey: '2026txcle_qm5', red: ['frc254'], blue: ['frc1678'] },
                { matchKey: '2026txcle_qm10', red: ['frc254'], blue: ['frc973'] },
            ];
            const distributions: TeamPerformanceDistribution[] = [
                createMockDistribution('frc254'),
                createMockDistribution('frc118'),
                createMockDistribution('frc1678'),
                createMockDistribution('frc973'),
            ];

            const result = predictUpcomingMatches(matches, distributions, 5);

            // Only match 10 should be included (> 5)
            expect(result).toHaveLength(1);
            expect(result[0].matchKey).toBe('2026txcle_qm10');
        });

        it('should return empty array when all matches played', () => {
            const matches: SimulatedMatch[] = [
                { matchKey: '2026txcle_qm1', red: ['frc254'], blue: ['frc118'] },
                { matchKey: '2026txcle_qm5', red: ['frc254'], blue: ['frc1678'] },
            ];
            const distributions: TeamPerformanceDistribution[] = [
                createMockDistribution('frc254'),
                createMockDistribution('frc118'),
                createMockDistribution('frc1678'),
            ];

            const result = predictUpcomingMatches(matches, distributions, 10);

            expect(result).toHaveLength(0);
        });

        it('should return predictions for all upcoming matches', () => {
            const matches: SimulatedMatch[] = [
                { matchKey: '2026txcle_qm5', red: ['frc254', 'frc1678', 'frc973'], blue: ['frc118', 'frc148', 'frc2056'] },
                { matchKey: '2026txcle_qm6', red: ['frc254', 'frc118', 'frc148'], blue: ['frc1678', 'frc973', 'frc2056'] },
            ];
            const distributions: TeamPerformanceDistribution[] = [
                createMockDistribution('frc254'),
                createMockDistribution('frc1678'),
                createMockDistribution('frc973'),
                createMockDistribution('frc118'),
                createMockDistribution('frc148'),
                createMockDistribution('frc2056'),
            ];

            const result = predictUpcomingMatches(matches, distributions, 0);

            expect(result).toHaveLength(2);
            result.forEach(pred => {
                expect(pred.matchKey).toBeDefined();
                expect(pred.predictedWinner).toBeDefined();
            });
        });
    });
});
