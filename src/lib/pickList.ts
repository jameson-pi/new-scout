/**
 * Pick List Generator & Synergy Analysis (REBUILT 2026)
 * Ranks teams by alliance compatibility
 */

import { ScoutReport, calculateTeamEPA } from './spr';
import { TeamReliability } from './reliability';

const TELE_TOWER: Record<string, number> = { Level1: 10, Level2: 20, Level3: 30, None: 0 };

export interface TeamSynergyProfile {
    teamKey: string;
    role: 'fuel_specialist' | 'tower_specialist' | 'hub_controller' | 'balanced' | 'defender';
    strengths: string[];
    avgFuel: number;
    avgTowerPts: number;
    towerRate: number;
    defenseRating: number;
    synergyScore: number;
}

export interface AllianceSynergy {
    teams: string[];
    combinedScore: number;
    roleBalance: number; // 0-100
    strengthCoverage: number; // 0-100
    predictedRPs: number;
}

/**
 * Analyze a team's role and synergy profile
 */
export function analyzeTeamRole(reports: ScoutReport[]): TeamSynergyProfile {
    if (reports.length === 0) {
        return {
            teamKey: '',
            role: 'balanced',
            strengths: [],
            avgFuel: 0,
            avgTowerPts: 0,
            towerRate: 0,
            defenseRating: 0,
            synergyScore: 0
        };
    }

    const teamKey = reports[0].teamKey;

    // Calculate averages (REBUILT 2026)
    const avgFuel = reports.reduce((acc, r) => acc + (r.data.auto.fuel_scored || 0) + (r.data.teleop.fuel_scored || 0), 0) / reports.length;
    const avgTowerPts = reports.reduce((acc, r) => acc + (TELE_TOWER[r.data.teleop.tower_level] || 0), 0) / reports.length;
    const towerRate = reports.filter(r => r.data.teleop.tower_level !== 'None').length / reports.length * 100;
    const defenseRating = reports.reduce((acc, r) => acc + (r.data.defender_rating || 0), 0) / reports.length;

    // Determine role
    let role: TeamSynergyProfile['role'] = 'balanced';
    if (avgFuel >= 30) role = 'fuel_specialist';
    else if (avgTowerPts >= 20) role = 'tower_specialist';
    else if (defenseRating >= 3) role = 'defender';
    else if (towerRate >= 80) role = 'hub_controller';

    // Identify strengths
    const strengths: string[] = [];
    if (avgFuel >= 20) strengths.push('Fuel Scoring');
    if (avgTowerPts >= 15) strengths.push('Tower');
    if (towerRate >= 60) strengths.push('Hub Control');
    if (defenseRating >= 3) strengths.push('Defense');

    // Calculate synergy score (higher = more valuable as alliance partner)
    const synergyScore = (avgFuel * 0.5) + (avgTowerPts * 1.0) + (towerRate * 0.3) + (defenseRating * 5);

    return { teamKey, role, strengths, avgFuel, avgTowerPts, towerRate, defenseRating, synergyScore };
}

/**
 * Generate pick list ranked by alliance compatibility
 */
export function generatePickList(
    reports: ScoutReport[],
    reliability: TeamReliability[],
    ourTeamKey?: string
): TeamSynergyProfile[] {
    const teamKeys = Array.from(new Set(reports.map(r => r.teamKey)));

    return teamKeys
        .filter(tk => tk !== ourTeamKey)
        .map(tk => {
            const teamReports = reports.filter(r => r.teamKey === tk);
            const profile = analyzeTeamRole(teamReports);

            // Adjust score by reliability
            const rel = reliability.find(r => r.teamKey === tk);
            if (rel) {
                profile.synergyScore *= (1 - rel.failureRate * 0.5);
                profile.synergyScore *= (rel.consistencyScore / 100);
            }

            return profile;
        })
        .sort((a, b) => b.synergyScore - a.synergyScore);
}

/**
 * Calculate alliance synergy for 3 teams
 */
export function calculateAllianceSynergy(
    team1: TeamSynergyProfile,
    team2: TeamSynergyProfile,
    team3: TeamSynergyProfile
): AllianceSynergy {
    const teams = [team1, team2, team3];

    // Role balance: best if all different roles
    const roles = teams.map(t => t.role);
    const uniqueRoles = new Set(roles).size;
    const roleBalance = (uniqueRoles / 3) * 100;

    // Strength coverage: how many unique strengths
    const allStrengths = teams.flatMap(t => t.strengths);
    const uniqueStrengths = new Set(allStrengths).size;
    const strengthCoverage = Math.min(100, uniqueStrengths * 25);

    // Combined score
    const combinedScore = teams.reduce((acc, t) => acc + t.synergyScore, 0);

    // Predicted RPs based on REBUILT 2026 rules
    // Energized RP: Score >= 100 FUEL
    const totalFuel = teams.reduce((acc, t) => acc + t.avgFuel, 0);
    const energizedRP = totalFuel >= 100 ? 1 : 0;

    // Traversal RP: Alliance scores >= 50 Tower points
    const totalTowerPts = teams.reduce((acc, t) => acc + t.avgTowerPts, 0);
    const traversalRP = totalTowerPts >= 50 ? 1 : 0;

    // Auto RP: Harder to predict without auto data
    const autoRP = 0.5; // Assume 50% chance

    // Win RP: 3 for win
    const winRP = combinedScore >= 150 ? 3 : 1.5;
    const predictedRPs = energizedRP + traversalRP + autoRP + winRP;

    return {
        teams: teams.map(t => t.teamKey),
        combinedScore,
        roleBalance,
        strengthCoverage,
        predictedRPs
    };
}
