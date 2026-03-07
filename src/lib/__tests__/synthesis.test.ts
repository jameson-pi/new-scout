import { synthesizeReports } from '../synthesis';
import { ScoutReport, RebuiltData } from '../spr';

// Helper to create mock scout reports (REBUILT 2026)
function createMockReport(
    scoutId: string,
    overrides: Partial<{
        autoFuel: number;
        teleopFuel: number;
        autoTower: 'None' | 'Level1';
        teleopTower: 'None' | 'Level1' | 'Level2' | 'Level3';
    }> = {}
): ScoutReport {
    const data: RebuiltData = {
        auto: {
            fuel_scored: overrides.autoFuel ?? 10,
            tower_level: overrides.autoTower ?? 'None',
            moved: true,
        },
        teleop: {
            fuel_scored: overrides.teleopFuel ?? 20,
            tower_level: overrides.teleopTower ?? 'Level1',
        },
    };

    return {
        scoutId,
        matchKey: '2026txcle_qm1',
        teamKey: 'frc254',
        alliance: 'red',
        data,
    };
}

describe('synthesis', () => {
    describe('synthesizeReports', () => {
        it('should throw error for empty reports', () => {
            expect(() => synthesizeReports([], {})).toThrow('No reports to synthesize');
        });

        it('should return single report data when no model exists', () => {
            const report = createMockReport('scout1', { autoFuel: 15, teleopFuel: 30 });
            const result = synthesizeReports([report], {});
            expect(result.auto.fuel_scored).toBe(15);
            expect(result.teleop.fuel_scored).toBe(30);
        });

        it('should calculate weighted mean for numeric fields', () => {
            const reports: ScoutReport[] = [
                createMockReport('scout1', { teleopFuel: 20 }),
                createMockReport('scout2', { teleopFuel: 30 }),
            ];
            const models = {
                scout1: { scoutId: 'scout1', bias: 0, variance: 1 },
                scout2: { scoutId: 'scout2', bias: 0, variance: 1 },
            };
            const result = synthesizeReports(reports, models);
            expect(result.teleop.fuel_scored).toBe(25);
        });

        it('should weight by inverse variance', () => {
            const reports: ScoutReport[] = [
                createMockReport('scout1', { teleopFuel: 10 }),
                createMockReport('scout2', { teleopFuel: 30 }),
            ];
            const models = {
                scout1: { scoutId: 'scout1', bias: 0, variance: 1 },
                scout2: { scoutId: 'scout2', bias: 0, variance: 10 },
            };
            const result = synthesizeReports(reports, models);
            expect(result.teleop.fuel_scored).toBeLessThan(25);
            expect(result.teleop.fuel_scored).toBeGreaterThan(10);
        });

        it('should apply debiasing', () => {
            const reports: ScoutReport[] = [
                createMockReport('scout1', { teleopFuel: 20 }),
                createMockReport('scout2', { teleopFuel: 20 }),
            ];
            const models = {
                scout1: { scoutId: 'scout1', bias: 10, variance: 1 },
                scout2: { scoutId: 'scout2', bias: 0, variance: 1 },
            };
            const result = synthesizeReports(reports, models);
            expect(result.teleop.fuel_scored).toBe(15);
        });

        it('should not go below zero after debiasing', () => {
            const reports: ScoutReport[] = [
                createMockReport('scout1', { teleopFuel: 5 }),
            ];
            const models = {
                scout1: { scoutId: 'scout1', bias: 20, variance: 1 },
            };
            const result = synthesizeReports(reports, models);
            expect(result.teleop.fuel_scored).toBe(0);
        });

        it('should use OR for boolean moved field', () => {
            const reports: ScoutReport[] = [
                createMockReport('scout1'),
                createMockReport('scout2'),
            ];
            reports[0].data.auto.moved = false;
            reports[1].data.auto.moved = true;
            const models = {
                scout1: { scoutId: 'scout1', bias: 0, variance: 1 },
                scout2: { scoutId: 'scout2', bias: 0, variance: 1 },
            };
            const result = synthesizeReports(reports, models);
            expect(result.auto.moved).toBe(true);
        });

        it('should synthesize tower level via weighted vote', () => {
            const reports: ScoutReport[] = [
                createMockReport('scout1', { teleopTower: 'Level3' }),
                createMockReport('scout2', { teleopTower: 'Level3' }),
                createMockReport('scout3', { teleopTower: 'Level1' }),
            ];
            const models = {
                scout1: { scoutId: 'scout1', bias: 0, variance: 1 },
                scout2: { scoutId: 'scout2', bias: 0, variance: 1 },
                scout3: { scoutId: 'scout3', bias: 0, variance: 1 },
            };
            const result = synthesizeReports(reports, models);
            expect(result.teleop.tower_level).toBe('Level3');
        });

        it('should weight tower vote by inverse variance', () => {
            const reports: ScoutReport[] = [
                createMockReport('scout1', { teleopTower: 'Level3' }),
                createMockReport('scout2', { teleopTower: 'Level1' }),
            ];
            const models = {
                scout1: { scoutId: 'scout1', bias: 0, variance: 1 },
                scout2: { scoutId: 'scout2', bias: 0, variance: 100 },
            };
            const result = synthesizeReports(reports, models);
            expect(result.teleop.tower_level).toBe('Level3');
        });

        it('should use default high variance for unknown scouts', () => {
            const reports: ScoutReport[] = [
                createMockReport('scout1', { teleopFuel: 20 }),
                createMockReport('unknown_scout', { teleopFuel: 40 }),
            ];
            const models = {
                scout1: { scoutId: 'scout1', bias: 0, variance: 1 },
            };
            const result = synthesizeReports(reports, models);
            expect(result.teleop.fuel_scored).toBeLessThan(30);
        });

        it('should synthesize all fields', () => {
            const reports: ScoutReport[] = [
                createMockReport('scout1'),
                createMockReport('scout2'),
            ];
            const models = {
                scout1: { scoutId: 'scout1', bias: 0, variance: 1 },
                scout2: { scoutId: 'scout2', bias: 0, variance: 1 },
            };
            const result = synthesizeReports(reports, models);
            expect(result.auto.fuel_scored).toBeDefined();
            expect(result.auto.tower_level).toBeDefined();
            expect(result.auto.moved).toBeDefined();
            expect(result.teleop.fuel_scored).toBeDefined();
            expect(result.teleop.tower_level).toBeDefined();
        });
    });
});
