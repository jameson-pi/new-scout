/**
 * Defense Analysis & Matchup Matrix
 * REBUILT 2026 Edition
 */

import { ScoutReport } from './spr';

export interface DefenseProfile {
    teamKey: string;
    defenseRating: number; // 0-5
    isDefender: boolean;
    effectivenessVsHub: number; // vs fuel/hub scorers
    effectivenessVsTower: number; // vs tower climbers
    gamesDefended: number;
}

export interface MatchupResult {
    defenderTeam: string;
    offenseTeam: string;
    effectiveness: 'high' | 'medium' | 'low';
    scoreDelta: number;
}

/**
 * Analyze a team's defensive capabilities
 */
export function analyzeDefenseProfile(reports: ScoutReport[]): DefenseProfile {
    if (reports.length === 0) {
        return {
            teamKey: '',
            defenseRating: 0,
            isDefender: false,
            effectivenessVsHub: 0,
            effectivenessVsTower: 0,
            gamesDefended: 0
        };
    }

    const teamKey = reports[0].teamKey;
    const defenseRating = reports.reduce((acc, r) => acc + (r.data.defender_rating || 0), 0) / reports.length;
    const isDefender = defenseRating >= 2.5;
    const gamesDefended = reports.filter(r => (r.data.defender_rating || 0) >= 2).length;

    const effectivenessVsHub = Math.min(100, defenseRating * 15);
    const effectivenessVsTower = Math.min(100, defenseRating * 20);

    return { teamKey, defenseRating, isDefender, effectivenessVsHub, effectivenessVsTower, gamesDefended };
}

/**
 * Generate matchup matrix for all teams
 */
export function generateMatchupMatrix(reports: ScoutReport[]): MatchupResult[] {
    const teamKeys = Array.from(new Set(reports.map(r => r.teamKey)));
    const results: MatchupResult[] = [];

    const defenseProfiles = teamKeys.map(tk => analyzeDefenseProfile(reports.filter(r => r.teamKey === tk)));
    const defenders = defenseProfiles.filter(p => p.isDefender);

    defenders.forEach(defender => {
        teamKeys.forEach(offenseTeam => {
            if (defender.teamKey === offenseTeam) return;

            const offenseReports = reports.filter(r => r.teamKey === offenseTeam);
            const avgFuel = offenseReports.reduce((acc, r) => acc + r.data.teleop.fuel_scored, 0) / offenseReports.length;

            const effectiveness = defender.defenseRating >= 4 ? 'high' : defender.defenseRating >= 2.5 ? 'medium' : 'low';
            const scoreDelta = defender.defenseRating * avgFuel * 0.1;

            results.push({
                defenderTeam: defender.teamKey,
                offenseTeam,
                effectiveness,
                scoreDelta
            });
        });
    });

    return results.sort((a, b) => b.scoreDelta - a.scoreDelta);
}
