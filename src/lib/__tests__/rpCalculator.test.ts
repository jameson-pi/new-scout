import {
    calculateRPProbability,
    calculateMatchRPProbabilities,
    RPProbability
} from '../rpCalculator';
import { TeamPerformanceDistribution } from '../simulation';
import { RebuiltData } from '../spr';

// Helper to create mock performance distribution (REBUILT 2026)
function createMockDistribution(
    teamKey: string,
    overrides: Partial<{
        autoFuel: number;
        teleopFuel: number;
        teleopTower: 'None' | 'Level1' | 'Level2' | 'Level3';
        moved: boolean;
    }> = {}
): TeamPerformanceDistribution {
    const pastMatches: RebuiltData[] = [{
        auto: {
            fuel_scored: overrides.autoFuel ?? 10,
            tower_level: 'None',
            moved: overrides.moved ?? true,
        },
        teleop: {
            fuel_scored: overrides.teleopFuel ?? 20,
            tower_level: overrides.teleopTower ?? 'Level1',
        },
    }];

    return { teamKey, pastSyntheticMatches: pastMatches };
}

describe('rpCalculator', () => {
    describe('calculateRPProbability', () => {
        it('should return probabilities between 0 and 1', () => {
            const redTeams = ['frc254', 'frc1678', 'frc973'];
            const blueTeams = ['frc118', 'frc148', 'frc2056'];
            const distributions: TeamPerformanceDistribution[] = [
                createMockDistribution('frc254'),
                createMockDistribution('frc1678'),
                createMockDistribution('frc973'),
                createMockDistribution('frc118'),
                createMockDistribution('frc148'),
                createMockDistribution('frc2056'),
            ];

            const result = calculateRPProbability(redTeams, blueTeams, distributions, 'red');

            expect(result.energizedRPProbability).toBeGreaterThanOrEqual(0);
            expect(result.energizedRPProbability).toBeLessThanOrEqual(1);
            expect(result.superchargedRPProbability).toBeGreaterThanOrEqual(0);
            expect(result.superchargedRPProbability).toBeLessThanOrEqual(1);
            expect(result.traversalRPProbability).toBeGreaterThanOrEqual(0);
            expect(result.traversalRPProbability).toBeLessThanOrEqual(1);
            expect(result.winProbability).toBeGreaterThanOrEqual(0);
            expect(result.winProbability).toBeLessThanOrEqual(1);
        });

        it('should calculate high energized RP probability when teams score lots of fuel', () => {
            const redTeams = ['frc254', 'frc1678', 'frc973'];
            const blueTeams = ['frc118', 'frc148', 'frc2056'];
            const distributions: TeamPerformanceDistribution[] = [
                createMockDistribution('frc254', { autoFuel: 20, teleopFuel: 30 }),
                createMockDistribution('frc1678', { autoFuel: 20, teleopFuel: 30 }),
                createMockDistribution('frc973', { autoFuel: 20, teleopFuel: 30 }),
                createMockDistribution('frc118'),
                createMockDistribution('frc148'),
                createMockDistribution('frc2056'),
            ];

            const result = calculateRPProbability(redTeams, blueTeams, distributions, 'red');

            // 150 total fuel >= 100 threshold = Energized RP
            expect(result.energizedRPProbability).toBeGreaterThan(0.5);
        });

        it('should calculate low energized RP probability when teams score little fuel', () => {
            const redTeams = ['frc254', 'frc1678', 'frc973'];
            const blueTeams = ['frc118', 'frc148', 'frc2056'];
            const distributions: TeamPerformanceDistribution[] = [
                createMockDistribution('frc254', { autoFuel: 2, teleopFuel: 5 }),
                createMockDistribution('frc1678', { autoFuel: 2, teleopFuel: 5 }),
                createMockDistribution('frc973', { autoFuel: 2, teleopFuel: 5 }),
                createMockDistribution('frc118'),
                createMockDistribution('frc148'),
                createMockDistribution('frc2056'),
            ];

            const result = calculateRPProbability(redTeams, blueTeams, distributions, 'red');

            // 21 total fuel < 100 threshold
            expect(result.energizedRPProbability).toBe(0);
        });

        it('should calculate high traversal RP probability with Level3 tower climbers', () => {
            const redTeams = ['frc254', 'frc1678', 'frc973'];
            const blueTeams = ['frc118', 'frc148', 'frc2056'];
            const distributions: TeamPerformanceDistribution[] = [
                createMockDistribution('frc254', { teleopTower: 'Level3' }),  // 30 pts
                createMockDistribution('frc1678', { teleopTower: 'Level2' }), // 20 pts = 50 total
                createMockDistribution('frc973', { teleopTower: 'Level1' }),
                createMockDistribution('frc118'),
                createMockDistribution('frc148'),
                createMockDistribution('frc2056'),
            ];

            const result = calculateRPProbability(redTeams, blueTeams, distributions, 'red');

            // 60 tower points >= 50 threshold
            expect(result.traversalRPProbability).toBeGreaterThan(0.5);
        });

        it('should calculate low traversal RP probability without tower climbers', () => {
            const redTeams = ['frc254', 'frc1678', 'frc973'];
            const blueTeams = ['frc118', 'frc148', 'frc2056'];
            const distributions: TeamPerformanceDistribution[] = [
                createMockDistribution('frc254', { teleopTower: 'None' }),
                createMockDistribution('frc1678', { teleopTower: 'None' }),
                createMockDistribution('frc973', { teleopTower: 'Level1' }),  // 10 pts
                createMockDistribution('frc118'),
                createMockDistribution('frc148'),
                createMockDistribution('frc2056'),
            ];

            const result = calculateRPProbability(redTeams, blueTeams, distributions, 'red');

            // 10 tower points < 50 threshold
            expect(result.traversalRPProbability).toBe(0);
        });

        it('should calculate expected RPs correctly', () => {
            const redTeams = ['frc254', 'frc1678', 'frc973'];
            const blueTeams = ['frc118', 'frc148', 'frc2056'];
            const distributions: TeamPerformanceDistribution[] = [
                createMockDistribution('frc254'),
                createMockDistribution('frc1678'),
                createMockDistribution('frc973'),
                createMockDistribution('frc118'),
                createMockDistribution('frc148'),
                createMockDistribution('frc2056'),
            ];

            const result = calculateRPProbability(redTeams, blueTeams, distributions, 'red');

            // Max possible = 3 (win) + 1 (energized) + 1 (supercharged) + 1 (traversal) = 6
            expect(result.expectedRPs).toBeGreaterThanOrEqual(0);
            expect(result.expectedRPs).toBeLessThanOrEqual(6);
        });

        it('should work for blue alliance', () => {
            const redTeams = ['frc254', 'frc1678', 'frc973'];
            const blueTeams = ['frc118', 'frc148', 'frc2056'];
            const distributions: TeamPerformanceDistribution[] = [
                createMockDistribution('frc254'),
                createMockDistribution('frc1678'),
                createMockDistribution('frc973'),
                createMockDistribution('frc118'),
                createMockDistribution('frc148'),
                createMockDistribution('frc2056'),
            ];

            const result = calculateRPProbability(redTeams, blueTeams, distributions, 'blue');

            expect(result.energizedRPProbability).toBeDefined();
            expect(result.superchargedRPProbability).toBeDefined();
            expect(result.traversalRPProbability).toBeDefined();
            expect(result.winProbability).toBeDefined();
        });
    });

    describe('calculateMatchRPProbabilities', () => {
        it('should set matchKey on result', () => {
            const redTeams = ['frc254', 'frc1678', 'frc973'];
            const blueTeams = ['frc118', 'frc148', 'frc2056'];
            const distributions: TeamPerformanceDistribution[] = [
                createMockDistribution('frc254'),
                createMockDistribution('frc1678'),
                createMockDistribution('frc973'),
                createMockDistribution('frc118'),
                createMockDistribution('frc148'),
                createMockDistribution('frc2056'),
            ];

            const result = calculateMatchRPProbabilities(
                '2026txcle_qm5', redTeams, blueTeams, distributions, 'red'
            );

            expect(result.matchKey).toBe('2026txcle_qm5');
        });

        it('should return all probability fields', () => {
            const redTeams = ['frc254', 'frc1678', 'frc973'];
            const blueTeams = ['frc118', 'frc148', 'frc2056'];
            const distributions: TeamPerformanceDistribution[] = [
                createMockDistribution('frc254'),
                createMockDistribution('frc1678'),
                createMockDistribution('frc973'),
                createMockDistribution('frc118'),
                createMockDistribution('frc148'),
                createMockDistribution('frc2056'),
            ];

            const result = calculateMatchRPProbabilities(
                '2026txcle_qm1', redTeams, blueTeams, distributions, 'blue'
            );

            expect(result).toHaveProperty('energizedRPProbability');
            expect(result).toHaveProperty('superchargedRPProbability');
            expect(result).toHaveProperty('traversalRPProbability');
            expect(result).toHaveProperty('winProbability');
            expect(result).toHaveProperty('expectedRPs');
        });
    });
});
