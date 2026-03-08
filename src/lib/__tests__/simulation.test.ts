import {
    runSimulation,
    SimulatedMatch,
    TeamPerformanceDistribution,
    SimResult
} from '../simulation';
import { RebuiltData } from '../spr';

// Helper to create mock performance distribution
function createMockDistribution(
    teamKey: string,
    performances: Array<Partial<{
        autoFuel: number;
        teleopFuel: number;
        teleopTower: 'No Attempt' | 'Level1' | 'Level2' | 'Level3';
        moved: boolean;
    }>> = [{}]
): TeamPerformanceDistribution {
    const pastMatches: RebuiltData[] = performances.map(perf => ({
        auto: {
            fuel_scored: perf.autoFuel ?? 10,
            climb_level: 'No Attempt' as const,
            moved: perf.moved ?? true,
        },
        teleop: {
            fuel_scored: perf.teleopFuel ?? 20,
            climb_level: perf.teleopTower ?? 'Level1' as const,
        },
    }));

    return {
        teamKey,
        pastSyntheticMatches: pastMatches,
    };
}

describe('simulation', () => {
    describe('runSimulation', () => {
        it('should return results for all teams', () => {
            const teams: TeamPerformanceDistribution[] = [
                createMockDistribution('frc254'),
                createMockDistribution('frc1678'),
                createMockDistribution('frc973'),
            ];
            const matches: SimulatedMatch[] = [];
            const currentRPs = { 'frc254': 6, 'frc1678': 6, 'frc973': 3 };

            const results = runSimulation(teams, matches, currentRPs);

            expect(results).toHaveLength(3);
            expect(results.map(r => r.teamKey)).toContain('frc254');
            expect(results.map(r => r.teamKey)).toContain('frc1678');
            expect(results.map(r => r.teamKey)).toContain('frc973');
        });

        it('should sort results by expected rank', () => {
            const teams: TeamPerformanceDistribution[] = [
                createMockDistribution('frc254'),
                createMockDistribution('frc1678'),
            ];
            const matches: SimulatedMatch[] = [];
            const currentRPs = { 'frc254': 10, 'frc1678': 5 };

            const results = runSimulation(teams, matches, currentRPs);

            // Higher RP team should have lower expected rank
            expect(results[0].teamKey).toBe('frc254');
        });

        it('should calculate avgRP based on current RPs when no remaining matches', () => {
            const teams: TeamPerformanceDistribution[] = [
                createMockDistribution('frc254'),
            ];
            const matches: SimulatedMatch[] = [];
            const currentRPs = { 'frc254': 12 };

            const results = runSimulation(teams, matches, currentRPs);

            expect(results[0].avgRP).toBe(12);
        });

        it('should simulate remaining matches', () => {
            const teams: TeamPerformanceDistribution[] = [
                createMockDistribution('frc254'),
                createMockDistribution('frc1678'),
                createMockDistribution('frc973'),
                createMockDistribution('frc118'),
                createMockDistribution('frc148'),
                createMockDistribution('frc2056'),
            ];
            const matches: SimulatedMatch[] = [
                { matchKey: '2026test_qm10', red: ['frc254', 'frc1678', 'frc973'], blue: ['frc118', 'frc148', 'frc2056'] },
            ];
            const currentRPs = {
                'frc254': 6, 'frc1678': 6, 'frc973': 6,
                'frc118': 6, 'frc148': 6, 'frc2056': 6
            };

            const results = runSimulation(teams, matches, currentRPs, 5);

            // All teams should have avgRP >= 6 (starting + potential gains)
            results.forEach(r => {
                expect(r.avgRP).toBeGreaterThanOrEqual(6);
            });
        });

        it('should respect matchLimit for played vs remaining matches', () => {
            const teams: TeamPerformanceDistribution[] = [
                createMockDistribution('frc254'),
                createMockDistribution('frc1678'),
                createMockDistribution('frc973'),
                createMockDistribution('frc118'),
                createMockDistribution('frc148'),
                createMockDistribution('frc2056'),
            ];
            const matches: SimulatedMatch[] = [
                { matchKey: '2026test_qm1', red: ['frc254', 'frc1678', 'frc973'], blue: ['frc118', 'frc148', 'frc2056'] },
                { matchKey: '2026test_qm5', red: ['frc254', 'frc118', 'frc148'], blue: ['frc1678', 'frc973', 'frc2056'] },
            ];
            const currentRPs = {
                'frc254': 3, 'frc1678': 3, 'frc973': 3,
                'frc118': 0, 'frc148': 0, 'frc2056': 0
            };

            // matchLimit = 2 means match 5 is in the future
            const results = runSimulation(teams, matches, currentRPs, 2);

            // Teams should have gained RPs from simulating qm5
            const team254 = results.find(r => r.teamKey === 'frc254');
            expect(team254?.avgRP).toBeGreaterThan(3);
        });

        it('should calculate rank distribution', () => {
            const teams: TeamPerformanceDistribution[] = [
                createMockDistribution('frc254'),
                createMockDistribution('frc1678'),
            ];
            const matches: SimulatedMatch[] = [];
            const currentRPs = { 'frc254': 10, 'frc1678': 10 };

            const results = runSimulation(teams, matches, currentRPs);

            results.forEach(r => {
                expect(r.rankDistribution).toBeDefined();
                expect(typeof r.rankDistribution).toBe('object');
            });
        });

        it('should calculate expected rank between 1 and team count', () => {
            const teams: TeamPerformanceDistribution[] = [
                createMockDistribution('frc254'),
                createMockDistribution('frc1678'),
                createMockDistribution('frc973'),
            ];
            const matches: SimulatedMatch[] = [];
            const currentRPs = { 'frc254': 6, 'frc1678': 6, 'frc973': 6 };

            const results = runSimulation(teams, matches, currentRPs);

            results.forEach(r => {
                expect(r.expectedRank).toBeGreaterThanOrEqual(1);
                expect(r.expectedRank).toBeLessThanOrEqual(3);
            });
        });

        it('should award win/tie RPs correctly', () => {
            // Create teams where one alliance clearly dominates
            const strongTeam = createMockDistribution('frc254', [
                { autoFuel: 25, teleopFuel: 50, teleopTower: 'Level3', moved: true },
                { autoFuel: 25, teleopFuel: 50, teleopTower: 'Level3', moved: true },
            ]);
            const weakTeam = createMockDistribution('frc9999', [
                { autoFuel: 0, teleopFuel: 0, teleopTower: 'None', moved: false },
            ]);

            const teams = [
                strongTeam,
                createMockDistribution('frc1678', [{ autoFuel: 20, teleopFuel: 40, teleopTower: 'Level3' }]),
                createMockDistribution('frc973', [{ autoFuel: 20, teleopFuel: 40, teleopTower: 'Level3' }]),
                weakTeam,
                createMockDistribution('frc100', [{ autoFuel: 2, teleopFuel: 5, teleopTower: 'None' }]),
                createMockDistribution('frc101', [{ autoFuel: 2, teleopFuel: 5, teleopTower: 'None' }]),
            ];
            const matches: SimulatedMatch[] = [
                { matchKey: '2026test_qm10', red: ['frc254', 'frc1678', 'frc973'], blue: ['frc9999', 'frc100', 'frc101'] },
            ];
            const currentRPs: Record<string, number> = {};
            teams.forEach(t => currentRPs[t.teamKey] = 0);

            const results = runSimulation(teams, matches, currentRPs, 5);

            // Strong alliance should generally have more RPs
            const team254 = results.find(r => r.teamKey === 'frc254');
            const team9999 = results.find(r => r.teamKey === 'frc9999');
            expect(team254?.avgRP).toBeGreaterThan(team9999?.avgRP || 0);
        });
    });
});
