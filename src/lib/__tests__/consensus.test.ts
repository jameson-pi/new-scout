import {
    calculateConsensus,
    getConsensusIssues,
    ConsensusMetric
} from '../consensus';
import { ScoutReport, RebuiltData } from '../spr';

// Helper to create mock scout reports (REBUILT 2026)
function createMockReport(
    teamKey: string,
    scoutId: string,
    overrides: Partial<RebuiltData> = {}
): ScoutReport {
    const defaultData: RebuiltData = {
        auto: {
            fuel_scored: 10,
            tower_level: 'None',
            moved: true,
        },
        teleop: {
            fuel_scored: 20,
            tower_level: 'Level1',
        },
        ...overrides,
    };

    return {
        scoutId,
        matchKey: '2026txcle_qm1',
        teamKey,
        alliance: 'red',
        data: defaultData,
    };
}

describe('consensus', () => {
    describe('calculateConsensus', () => {
        it('should return 100% consensus for empty reports', () => {
            const result = calculateConsensus([]);

            expect(result.teamKey).toBe('');
            expect(result.scouterCount).toBe(0);
            expect(result.overallConsensus).toBe(100);
            expect(result.flaggedMetrics).toHaveLength(0);
        });

        it('should calculate consensus for agreeing scouts', () => {
            const reports: ScoutReport[] = [
                createMockReport('frc254', 'scout1'),
                createMockReport('frc254', 'scout2'),
                createMockReport('frc254', 'scout3'),
            ];

            const result = calculateConsensus(reports);

            expect(result.teamKey).toBe('frc254');
            expect(result.scouterCount).toBe(3);
            expect(result.overallConsensus).toBe(100); // All agree
            expect(result.flaggedMetrics).toHaveLength(0);
        });

        it('should flag metrics with high disagreement', () => {
            const reports: ScoutReport[] = [
                createMockReport('frc254', 'scout1', {
                    teleop: { fuel_scored: 0, tower_level: 'None' }
                }),
                createMockReport('frc254', 'scout2', {
                    teleop: { fuel_scored: 50, tower_level: 'Level3' }
                }),
            ];

            const result = calculateConsensus(reports);

            expect(result.teamKey).toBe('frc254');
            expect(result.flaggedMetrics.length).toBeGreaterThan(0);
            expect(result.flaggedMetrics).toContain('Teleop Fuel');
            expect(result.overallConsensus).toBeLessThan(100);
        });

        it('should calculate variance correctly', () => {
            const reports: ScoutReport[] = [
                createMockReport('frc254', 'scout1'),
                createMockReport('frc254', 'scout2'),
            ];

            const result = calculateConsensus(reports);

            result.metrics.forEach(metric => {
                expect(metric.variance).toBeGreaterThanOrEqual(0);
                expect(metric.stdDev).toBeGreaterThanOrEqual(0);
            });
        });

        it('should count unique scouters correctly', () => {
            const reports: ScoutReport[] = [
                createMockReport('frc254', 'scout1'),
                createMockReport('frc254', 'scout1'),
                createMockReport('frc254', 'scout2'),
            ];

            const result = calculateConsensus(reports);

            expect(result.scouterCount).toBe(2); // Only 2 unique scouts
        });
    });

    describe('getConsensusIssues', () => {
        it('should return empty array when no issues', () => {
            const reports: ScoutReport[] = [
                createMockReport('frc254', 'scout1'),
                createMockReport('frc254', 'scout2'),
                createMockReport('frc1678', 'scout1'),
                createMockReport('frc1678', 'scout2'),
            ];

            const issues = getConsensusIssues(reports);

            expect(issues).toHaveLength(0);
        });

        it('should return teams with consensus issues sorted by severity', () => {
            const reports: ScoutReport[] = [
                createMockReport('frc254', 'scout1', {
                    teleop: { fuel_scored: 0, tower_level: 'None' }
                }),
                createMockReport('frc254', 'scout2', {
                    teleop: { fuel_scored: 50, tower_level: 'Level3' }
                }),
                createMockReport('frc1678', 'scout1'),
                createMockReport('frc1678', 'scout2'),
            ];

            const issues = getConsensusIssues(reports);

            expect(issues.length).toBeGreaterThan(0);
            expect(issues[0].teamKey).toBe('frc254');
        });
    });
});
