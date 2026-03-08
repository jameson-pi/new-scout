import {
    analyzeTeamRole,
    generatePickList,
    calculateAllianceSynergy,
    TeamSynergyProfile,
    AllianceSynergy
} from '../pickList';
import { ScoutReport, RebuiltData } from '../spr';
import { TeamReliability } from '../reliability';

// Helper to create mock scout reports (REBUILT 2026)
function createMockReport(
    teamKey: string,
    overrides: {
        fuel?: number;
        tower?: 'No Attempt' | 'Level1' | 'Level2' | 'Level3';
        defenderRating?: number;
    } = {}
): ScoutReport {
    const data: RebuiltData = {
        auto: {
            fuel_scored: overrides.fuel ?? 10,
            climb_level: 'No Attempt',
            moved: true,
        },
        teleop: {
            fuel_scored: overrides.fuel ?? 20,
            climb_level: overrides.tower ?? 'Level1',
        },
        defender_rating: overrides.defenderRating ?? 0,
    };

    return {
        scoutId: 'scout1',
        matchKey: '2026txcle_qm1',
        teamKey,
        alliance: 'red',
        data,
    };
}

describe('pickList', () => {
    describe('analyzeTeamRole', () => {
        it('should return default values for empty reports', () => {
            const result = analyzeTeamRole([]);
            expect(result.teamKey).toBe('');
            expect(result.role).toBe('balanced');
            expect(result.strengths).toHaveLength(0);
            expect(result.synergyScore).toBe(0);
        });

        it('should identify fuel specialist', () => {
            const reports: ScoutReport[] = [
                createMockReport('frc254', { fuel: 40 }),
                createMockReport('frc254', { fuel: 45 }),
                createMockReport('frc254', { fuel: 40 }),
            ];
            const result = analyzeTeamRole(reports);
            expect(result.role).toBe('fuel_specialist');
            expect(result.strengths).toContain('Fuel Scoring');
        });

        it('should identify tower specialist', () => {
            const reports: ScoutReport[] = [
                createMockReport('frc254', { fuel: 5, tower: 'Level3' }),
                createMockReport('frc254', { fuel: 5, tower: 'Level3' }),
                createMockReport('frc254', { fuel: 5, tower: 'Level3' }),
            ];
            const result = analyzeTeamRole(reports);
            expect(result.role).toBe('tower_specialist');
            expect(result.strengths).toContain('Tower');
        });

        it('should identify defender', () => {
            const reports: ScoutReport[] = [
                createMockReport('frc254', { fuel: 5, defenderRating: 4 }),
                createMockReport('frc254', { fuel: 5, defenderRating: 4 }),
                createMockReport('frc254', { fuel: 5, defenderRating: 3 }),
            ];
            const result = analyzeTeamRole(reports);
            expect(result.role).toBe('defender');
            expect(result.strengths).toContain('Defense');
        });

        it('should calculate tower rate correctly', () => {
            const reports: ScoutReport[] = [
                createMockReport('frc254', { tower: 'Level3' }),
                createMockReport('frc254', { tower: 'Level2' }),
                createMockReport('frc254', { tower: 'No Attempt' }),
                createMockReport('frc254', { tower: 'No Attempt' }),
            ];
            const result = analyzeTeamRole(reports);
            expect(result.towerRate).toBe(50); // 2/4 climbed tower
        });

        it('should calculate synergy score', () => {
            const reports: ScoutReport[] = [
                createMockReport('frc254', { fuel: 30, tower: 'Level3' }),
                createMockReport('frc254', { fuel: 30, tower: 'Level3' }),
            ];
            const result = analyzeTeamRole(reports);
            expect(result.synergyScore).toBeGreaterThan(0);
        });
    });

    describe('generatePickList', () => {
        it('should exclude our team from pick list', () => {
            const reports: ScoutReport[] = [
                createMockReport('frc254'),
                createMockReport('frc1678'),
                createMockReport('frc973'),
            ];
            const reliability: TeamReliability[] = [];
            const result = generatePickList(reports, reliability, 'frc254');
            expect(result.map(p => p.teamKey)).not.toContain('frc254');
            expect(result.map(p => p.teamKey)).toContain('frc1678');
            expect(result.map(p => p.teamKey)).toContain('frc973');
        });

        it('should sort by synergy score descending', () => {
            const reports: ScoutReport[] = [
                createMockReport('frc254', { fuel: 50 }),
                createMockReport('frc1678', { fuel: 5 }),
                createMockReport('frc973', { fuel: 25 }),
            ];
            const reliability: TeamReliability[] = [];
            const result = generatePickList(reports, reliability);
            expect(result[0].teamKey).toBe('frc254');
            expect(result[result.length - 1].teamKey).toBe('frc1678');
        });

        it('should adjust score by reliability', () => {
            const reports: ScoutReport[] = [
                createMockReport('frc254', { fuel: 30 }),
                createMockReport('frc254', { fuel: 30 }),
                createMockReport('frc1678', { fuel: 30 }),
                createMockReport('frc1678', { fuel: 30 }),
            ];
            const reliability: TeamReliability[] = [
                { teamKey: 'frc254', failureRate: 0, failureCount: 0, matchCount: 2, consistencyScore: 100, riskLevel: 'low' },
                { teamKey: 'frc1678', failureRate: 0.5, failureCount: 1, matchCount: 2, consistencyScore: 50, riskLevel: 'high' },
            ];
            const result = generatePickList(reports, reliability);
            expect(result[0].teamKey).toBe('frc254');
        });
    });

    describe('calculateAllianceSynergy', () => {
        it('should calculate combined score', () => {
            const team1: TeamSynergyProfile = {
                teamKey: 'frc254', role: 'fuel_specialist', strengths: ['Fuel Scoring'],
                avgFuel: 40, avgTowerPts: 10, towerRate: 80, defenseRating: 0, synergyScore: 50,
            };
            const team2: TeamSynergyProfile = {
                teamKey: 'frc1678', role: 'tower_specialist', strengths: ['Tower'],
                avgFuel: 10, avgTowerPts: 25, towerRate: 100, defenseRating: 0, synergyScore: 40,
            };
            const team3: TeamSynergyProfile = {
                teamKey: 'frc973', role: 'hub_controller', strengths: ['Hub Control'],
                avgFuel: 20, avgTowerPts: 15, towerRate: 60, defenseRating: 0, synergyScore: 30,
            };
            const result = calculateAllianceSynergy(team1, team2, team3);
            expect(result.teams).toEqual(['frc254', 'frc1678', 'frc973']);
            expect(result.combinedScore).toBe(120);
        });

        it('should reward role diversity', () => {
            const diverseTeam1: TeamSynergyProfile = {
                teamKey: 'frc254', role: 'fuel_specialist', strengths: [], avgFuel: 0, avgTowerPts: 0, towerRate: 0, defenseRating: 0, synergyScore: 50
            };
            const diverseTeam2: TeamSynergyProfile = {
                teamKey: 'frc1678', role: 'tower_specialist', strengths: [], avgFuel: 0, avgTowerPts: 0, towerRate: 0, defenseRating: 0, synergyScore: 50
            };
            const diverseTeam3: TeamSynergyProfile = {
                teamKey: 'frc973', role: 'defender', strengths: [], avgFuel: 0, avgTowerPts: 0, towerRate: 0, defenseRating: 0, synergyScore: 50
            };
            const sameTeam1: TeamSynergyProfile = {
                teamKey: 'frc254', role: 'balanced', strengths: [], avgFuel: 0, avgTowerPts: 0, towerRate: 0, defenseRating: 0, synergyScore: 50
            };
            const sameTeam2: TeamSynergyProfile = {
                teamKey: 'frc1678', role: 'balanced', strengths: [], avgFuel: 0, avgTowerPts: 0, towerRate: 0, defenseRating: 0, synergyScore: 50
            };
            const sameTeam3: TeamSynergyProfile = {
                teamKey: 'frc973', role: 'balanced', strengths: [], avgFuel: 0, avgTowerPts: 0, towerRate: 0, defenseRating: 0, synergyScore: 50
            };
            const diverseResult = calculateAllianceSynergy(diverseTeam1, diverseTeam2, diverseTeam3);
            const sameResult = calculateAllianceSynergy(sameTeam1, sameTeam2, sameTeam3);
            expect(diverseResult.roleBalance).toBe(100);
            expect(sameResult.roleBalance).toBeCloseTo(33.33, 0);
        });

        it('should calculate predicted RPs', () => {
            const team1: TeamSynergyProfile = {
                teamKey: 'frc254', role: 'fuel_specialist', strengths: ['Fuel Scoring', 'Tower'],
                avgFuel: 40, avgTowerPts: 20, towerRate: 90, defenseRating: 0, synergyScore: 100
            };
            const team2: TeamSynergyProfile = {
                teamKey: 'frc1678', role: 'tower_specialist', strengths: ['Tower'],
                avgFuel: 20, avgTowerPts: 25, towerRate: 80, defenseRating: 0, synergyScore: 80
            };
            const team3: TeamSynergyProfile = {
                teamKey: 'frc973', role: 'hub_controller', strengths: ['Hub Control'],
                avgFuel: 30, avgTowerPts: 15, towerRate: 100, defenseRating: 0, synergyScore: 60
            };
            const result = calculateAllianceSynergy(team1, team2, team3);
            expect(result.predictedRPs).toBeGreaterThan(0);
            expect(result.predictedRPs).toBeLessThanOrEqual(6);
        });
    });
});
