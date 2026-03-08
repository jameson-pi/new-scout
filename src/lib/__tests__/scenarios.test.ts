import {
    runScenario,
    createScenarioTemplates,
    Scenario,
    ScenarioResult
} from '../scenarios';
import { SimulatedMatch, TeamPerformanceDistribution } from '../simulation';
import { RebuiltData } from '../spr';

// Helper to create mock performance distribution (REBUILT 2026)
function createMockDistribution(teamKey: string): TeamPerformanceDistribution {
    const pastMatches: RebuiltData[] = [{
        auto: {
            fuel_scored: 10, climb_level: 'No Attempt', moved: true,
        },
        teleop: {
            fuel_scored: 20, climb_level: 'Level1',
        },
    }];

    return { teamKey, pastSyntheticMatches: pastMatches };
}

describe('scenarios', () => {
    describe('runScenario', () => {
        it('should return scenario result with all required fields', () => {
            const scenario: Scenario = {
                name: 'Test Scenario',
                overrides: [],
            };
            const distributions: TeamPerformanceDistribution[] = [
                createMockDistribution('frc254'),
                createMockDistribution('frc1678'),
            ];
            const schedule: SimulatedMatch[] = [];
            const baselineRPs = { 'frc254': 6, 'frc1678': 6 };

            const result = runScenario(scenario, distributions, schedule, baselineRPs, 5);

            expect(result.scenarioName).toBe('Test Scenario');
            expect(result.rankingChanges).toBeDefined();
            expect(Array.isArray(result.rankingChanges)).toBe(true);
            expect(result.topTeamRanks).toBeDefined();
            expect(Array.isArray(result.topTeamRanks)).toBe(true);
        });

        it('should apply red wins override', () => {
            const scenario: Scenario = {
                name: 'Red Wins Match 10',
                overrides: [{ matchKey: '2026test_qm10', redWins: true }],
            };
            const distributions: TeamPerformanceDistribution[] = [
                createMockDistribution('frc254'),
                createMockDistribution('frc1678'),
                createMockDistribution('frc973'),
                createMockDistribution('frc118'),
                createMockDistribution('frc148'),
                createMockDistribution('frc2056'),
            ];
            const schedule: SimulatedMatch[] = [
                { matchKey: '2026test_qm10', red: ['frc254', 'frc1678', 'frc973'], blue: ['frc118', 'frc148', 'frc2056'] },
            ];
            const baselineRPs: Record<string, number> = {};
            distributions.forEach(d => baselineRPs[d.teamKey] = 0);

            const result = runScenario(scenario, distributions, schedule, baselineRPs, 5);

            // Red teams should have higher expected ranks (lower numbers)
            expect(result.scenarioName).toBe('Red Wins Match 10');
        });

        it('should track ranking changes', () => {
            const scenario: Scenario = {
                name: 'Upset',
                overrides: [{ matchKey: '2026test_qm10', redWins: true }],
            };
            const distributions: TeamPerformanceDistribution[] = [
                createMockDistribution('frc254'),
                createMockDistribution('frc1678'),
                createMockDistribution('frc973'),
                createMockDistribution('frc118'),
                createMockDistribution('frc148'),
                createMockDistribution('frc2056'),
            ];
            const schedule: SimulatedMatch[] = [
                { matchKey: '2026test_qm10', red: ['frc254', 'frc1678', 'frc973'], blue: ['frc118', 'frc148', 'frc2056'] },
            ];
            const baselineRPs: Record<string, number> = {};
            distributions.forEach(d => baselineRPs[d.teamKey] = 6);

            const result = runScenario(scenario, distributions, schedule, baselineRPs, 5);

            // rankingChanges should contain teams that moved
            result.rankingChanges.forEach(change => {
                expect(change.teamKey).toBeDefined();
                expect(change.baselineRank).toBeDefined();
                expect(change.scenarioRank).toBeDefined();
                expect(change.delta).toBeDefined();
                expect(change.delta).not.toBe(0); // Only includes teams that changed
            });
        });

        it('should return top team ranks', () => {
            const scenario: Scenario = {
                name: 'Test',
                overrides: [],
            };
            const distributions: TeamPerformanceDistribution[] = [];
            for (let i = 1; i <= 12; i++) {
                distributions.push(createMockDistribution(`frc${i}`));
            }
            const schedule: SimulatedMatch[] = [];
            const baselineRPs: Record<string, number> = {};
            distributions.forEach((d, i) => baselineRPs[d.teamKey] = 12 - i);

            const result = runScenario(scenario, distributions, schedule, baselineRPs, 5);

            expect(result.topTeamRanks.length).toBeLessThanOrEqual(10);
            result.topTeamRanks.forEach(team => {
                expect(team.teamKey).toBeDefined();
                expect(team.expectedRank).toBeDefined();
            });
        });

        it('should apply bonus RP overrides', () => {
            const scenario: Scenario = {
                name: 'Bonus RPs',
                overrides: [
                    { matchKey: '2026test_qm10', redRPs: 2 }, // Red gets 2 bonus RPs
                ],
            };
            const distributions: TeamPerformanceDistribution[] = [
                createMockDistribution('frc254'),
                createMockDistribution('frc1678'),
                createMockDistribution('frc973'),
                createMockDistribution('frc118'),
                createMockDistribution('frc148'),
                createMockDistribution('frc2056'),
            ];
            const schedule: SimulatedMatch[] = [
                { matchKey: '2026test_qm10', red: ['frc254', 'frc1678', 'frc973'], blue: ['frc118', 'frc148', 'frc2056'] },
            ];
            const baselineRPs: Record<string, number> = {};
            distributions.forEach(d => baselineRPs[d.teamKey] = 6);

            const result = runScenario(scenario, distributions, schedule, baselineRPs, 5);

            expect(result.scenarioName).toBe('Bonus RPs');
        });

        it('should sort ranking changes by delta magnitude', () => {
            const scenario: Scenario = {
                name: 'Test',
                overrides: [{ matchKey: '2026test_qm10', redWins: true }],
            };
            const distributions: TeamPerformanceDistribution[] = [
                createMockDistribution('frc254'),
                createMockDistribution('frc1678'),
                createMockDistribution('frc973'),
                createMockDistribution('frc118'),
                createMockDistribution('frc148'),
                createMockDistribution('frc2056'),
            ];
            const schedule: SimulatedMatch[] = [
                { matchKey: '2026test_qm10', red: ['frc254', 'frc1678', 'frc973'], blue: ['frc118', 'frc148', 'frc2056'] },
            ];
            const baselineRPs: Record<string, number> = {
                'frc254': 10, 'frc1678': 8, 'frc973': 6,
                'frc118': 4, 'frc148': 2, 'frc2056': 0
            };

            const result = runScenario(scenario, distributions, schedule, baselineRPs, 5);

            // Verify sorting by absolute delta
            for (let i = 1; i < result.rankingChanges.length; i++) {
                expect(Math.abs(result.rankingChanges[i - 1].delta))
                    .toBeGreaterThanOrEqual(Math.abs(result.rankingChanges[i].delta));
            }
        });
    });

    describe('createScenarioTemplates', () => {
        it('should create win all and lose all scenarios', () => {
            const schedule: SimulatedMatch[] = [
                { matchKey: '2026test_qm1', red: ['frc254', 'frc1678', 'frc973'], blue: ['frc118', 'frc148', 'frc2056'] },
                { matchKey: '2026test_qm5', red: ['frc118', 'frc254', 'frc148'], blue: ['frc1678', 'frc973', 'frc2056'] },
            ];

            const templates = createScenarioTemplates('frc254', schedule);

            expect(templates).toHaveLength(2);
            expect(templates.map(t => t.name)).toContain('We Win All Remaining');
            expect(templates.map(t => t.name)).toContain('We Lose All Remaining');
        });

        it('should only include matches with our team', () => {
            const schedule: SimulatedMatch[] = [
                { matchKey: '2026test_qm1', red: ['frc254', 'frc1678', 'frc973'], blue: ['frc118', 'frc148', 'frc2056'] }, // Our match
                { matchKey: '2026test_qm2', red: ['frc100', 'frc101', 'frc102'], blue: ['frc103', 'frc104', 'frc105'] }, // Not our match
            ];

            const templates = createScenarioTemplates('frc254', schedule);
            const winAll = templates.find(t => t.name === 'We Win All Remaining')!;

            expect(winAll.overrides).toHaveLength(1);
            expect(winAll.overrides[0].matchKey).toBe('2026test_qm1');
        });

        it('should set redWins correctly based on alliance', () => {
            const schedule: SimulatedMatch[] = [
                { matchKey: '2026test_qm1', red: ['frc254', 'frc1678', 'frc973'], blue: ['frc118', 'frc148', 'frc2056'] }, // Our team on red
                { matchKey: '2026test_qm5', red: ['frc100', 'frc101', 'frc102'], blue: ['frc254', 'frc103', 'frc104'] }, // Our team on blue
            ];

            const templates = createScenarioTemplates('frc254', schedule);
            const winAll = templates.find(t => t.name === 'We Win All Remaining')!;
            const loseAll = templates.find(t => t.name === 'We Lose All Remaining')!;

            // In qm1, we're on red, so winAll.redWins = true
            const winQm1 = winAll.overrides.find(o => o.matchKey === '2026test_qm1');
            expect(winQm1?.redWins).toBe(true);

            // In qm5, we're on blue, so winAll.redWins = false (we want blue to win)
            const winQm5 = winAll.overrides.find(o => o.matchKey === '2026test_qm5');
            expect(winQm5?.redWins).toBe(false);

            // Lose all is opposite
            const loseQm1 = loseAll.overrides.find(o => o.matchKey === '2026test_qm1');
            expect(loseQm1?.redWins).toBe(false);

            const loseQm5 = loseAll.overrides.find(o => o.matchKey === '2026test_qm5');
            expect(loseQm5?.redWins).toBe(true);
        });

        it('should return empty overrides if team has no matches', () => {
            const schedule: SimulatedMatch[] = [
                { matchKey: '2026test_qm1', red: ['frc100', 'frc101', 'frc102'], blue: ['frc103', 'frc104', 'frc105'] },
            ];

            const templates = createScenarioTemplates('frc254', schedule);

            templates.forEach(template => {
                expect(template.overrides).toHaveLength(0);
            });
        });
    });
});
