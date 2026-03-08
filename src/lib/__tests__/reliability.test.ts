import {
    calculateTeamReliability,
    calculateAllTeamReliability,
    TeamReliability
} from '../reliability';
import { ScoutReport, RebuiltData } from '../spr';

// Helper to create mock scout reports (REBUILT 2026)
function createMockReport(
    teamKey: string,
    mechFailure: boolean = false,
    scores: Partial<{ fuel: number }> = {}
): ScoutReport {
    const data: RebuiltData = {
        auto: {
            fuel_scored: scores.fuel ?? 10,
            climb_level: 'No Attempt',
            moved: true,
        },
        teleop: {
            fuel_scored: scores.fuel ?? 20,
            climb_level: 'Level1',
        },
        mech_failure: mechFailure,
    };

    return {
        scoutId: 'scout1',
        matchKey: '2026txcle_qm1',
        teamKey,
        alliance: 'red',
        data,
    };
}

describe('reliability', () => {
    describe('calculateTeamReliability', () => {
        it('should return default values for empty reports', () => {
            const result = calculateTeamReliability([]);

            expect(result.teamKey).toBe('');
            expect(result.failureRate).toBe(0);
            expect(result.failureCount).toBe(0);
            expect(result.matchCount).toBe(0);
            expect(result.consistencyScore).toBe(50);
            expect(result.riskLevel).toBe('medium');
        });

        it('should calculate zero failure rate when no failures', () => {
            const reports: ScoutReport[] = [
                createMockReport('frc254', false),
                createMockReport('frc254', false),
                createMockReport('frc254', false),
            ];

            const result = calculateTeamReliability(reports);

            expect(result.teamKey).toBe('frc254');
            expect(result.failureRate).toBe(0);
            expect(result.failureCount).toBe(0);
            expect(result.matchCount).toBe(3);
            expect(result.riskLevel).toBe('low');
        });

        it('should calculate failure rate correctly', () => {
            const reports: ScoutReport[] = [
                createMockReport('frc254', true),  // failure
                createMockReport('frc254', false),
                createMockReport('frc254', false),
                createMockReport('frc254', false),
            ];

            const result = calculateTeamReliability(reports);

            expect(result.failureRate).toBe(0.25);
            expect(result.failureCount).toBe(1);
            expect(result.matchCount).toBe(4);
            expect(result.riskLevel).toBe('high'); // >= 0.25 is high
        });

        it('should classify medium risk correctly', () => {
            const reports: ScoutReport[] = [
                createMockReport('frc254', true),  // failure (10%)
                createMockReport('frc254', false),
                createMockReport('frc254', false),
                createMockReport('frc254', false),
                createMockReport('frc254', false),
                createMockReport('frc254', false),
                createMockReport('frc254', false),
                createMockReport('frc254', false),
                createMockReport('frc254', false),
                createMockReport('frc254', false),
            ];

            const result = calculateTeamReliability(reports);

            expect(result.failureRate).toBe(0.1);
            expect(result.riskLevel).toBe('medium'); // >= 0.1 is medium
        });

        it('should calculate high consistency for consistent scores', () => {
            const reports: ScoutReport[] = [
                createMockReport('frc254', false, { fuel: 10 }),
                createMockReport('frc254', false, { fuel: 10 }),
                createMockReport('frc254', false, { fuel: 10 }),
            ];

            const result = calculateTeamReliability(reports);

            expect(result.consistencyScore).toBe(100); // No variance = max consistency
        });

        it('should calculate lower consistency for variable scores', () => {
            const reports: ScoutReport[] = [
                createMockReport('frc254', false, { fuel: 0 }),
                createMockReport('frc254', false, { fuel: 5 }),
                createMockReport('frc254', false, { fuel: 10 }),
            ];

            const result = calculateTeamReliability(reports);

            expect(result.consistencyScore).toBeLessThan(100);
        });
    });

    describe('calculateAllTeamReliability', () => {
        it('should calculate reliability for multiple teams', () => {
            const reports: ScoutReport[] = [
                createMockReport('frc254', false),
                createMockReport('frc254', false),
                createMockReport('frc1678', true),
                createMockReport('frc1678', false),
            ];

            const results = calculateAllTeamReliability(reports);

            expect(results).toHaveLength(2);
            expect(results.map(r => r.teamKey)).toContain('frc254');
            expect(results.map(r => r.teamKey)).toContain('frc1678');
        });

        it('should sort by failure rate ascending', () => {
            const reports: ScoutReport[] = [
                createMockReport('frc254', true),  // 50% failure
                createMockReport('frc254', false),
                createMockReport('frc1678', false), // 0% failure
                createMockReport('frc1678', false),
            ];

            const results = calculateAllTeamReliability(reports);

            expect(results[0].teamKey).toBe('frc1678'); // Lower failure rate first
            expect(results[1].teamKey).toBe('frc254');
        });

        it('should return empty array for no reports', () => {
            const results = calculateAllTeamReliability([]);

            expect(results).toHaveLength(0);
        });
    });
});
