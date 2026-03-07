/**
 * Reliability Tracker
 * Calculates mechanical failure rates and consistency scores
 * REBUILT 2026 Edition
 */

import { ScoutReport } from './spr';

export interface TeamReliability {
    teamKey: string;
    failureRate: number; // 0-1
    failureCount: number;
    matchCount: number;
    consistencyScore: number; // 0-100 (higher = more consistent)
    riskLevel: 'low' | 'medium' | 'high';
}

const TELE_TOWER: Record<string, number> = { Level1: 10, Level2: 20, Level3: 30, None: 0 };

/**
 * Calculate reliability metrics for a team
 */
export function calculateTeamReliability(reports: ScoutReport[]): TeamReliability {
    if (reports.length === 0) {
        return {
            teamKey: '',
            failureRate: 0,
            failureCount: 0,
            matchCount: 0,
            consistencyScore: 50,
            riskLevel: 'medium'
        };
    }

    const teamKey = reports[0].teamKey;
    const failureCount = reports.filter(r => r.data.mech_failure).length;
    const failureRate = failureCount / reports.length;

    // Calculate consistency based on score variance (REBUILT 2026 scoring)
    const scores = reports.map(r => {
        const d = r.data;
        return (d.auto.fuel_scored * 1) + (d.teleop.fuel_scored * 1) +
            (TELE_TOWER[d.teleop.tower_level] || 0) +
            (d.auto.moved ? 3 : 0);
    });

    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((acc, s) => acc + Math.pow(s - avgScore, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    // Consistency: lower std dev = higher consistency
    const consistencyScore = Math.max(0, Math.min(100, 100 - (stdDev * 3)));

    // Risk level based on failure rate
    const riskLevel = failureRate >= 0.25 ? 'high' : failureRate >= 0.1 ? 'medium' : 'low';

    return {
        teamKey,
        failureRate,
        failureCount,
        matchCount: reports.length,
        consistencyScore,
        riskLevel
    };
}

/**
 * Calculate reliability for all teams
 */
export function calculateAllTeamReliability(reports: ScoutReport[]): TeamReliability[] {
    const teamKeys = Array.from(new Set(reports.map(r => r.teamKey)));
    return teamKeys.map(tk => {
        const teamReports = reports.filter(r => r.teamKey === tk);
        return calculateTeamReliability(teamReports);
    }).sort((a, b) => a.failureRate - b.failureRate);
}
