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

const TELE_TOWER: Record<string, number> = { Level1: 10, Level2: 20, Level3: 30, 'No Attempt': 0 };

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
        return (d.auto.fuel_scored) + (d.teleop.fuel_scored) +
            (TELE_TOWER[d.teleop.climb_level] || 0) +
            (d.auto.moved ? 3 : 0);
    });

    const n = scores.length;
    const sorted = [...scores].sort((a, b) => a - b);

    // Median
    const median = n % 2 === 0
        ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
        : sorted[Math.floor(n / 2)];

    // IQR (interquartile range) — robust to outliers unlike stdDev
    const q1 = sorted[Math.floor(n * 0.25)];
    const q3 = sorted[Math.ceil(n * 0.75) - 1] ?? sorted[sorted.length - 1];
    const iqr = (q3 ?? 0) - (q1 ?? 0);

    // Relative IQR (IQR / median) normalises for team output level.
    // A team scoring consistently ~150 with ±10 swing → rIQR ≈ 0.07 → very consistent.
    // A team all over the place 30–200 → rIQR ≈ 1.0 → inconsistent.
    let rawConsistency: number;
    if (median > 5) {
        const rIQR = iqr / median;           // 0 = perfect, 1+ = chaotic
        rawConsistency = Math.max(0, Math.min(100, 100 - (rIQR * 80)));
    } else {
        rawConsistency = Math.max(0, Math.min(100, 100 - (iqr * 3)));
    }

    // Failure rate penalty — a team that breaks often is never truly consistent
    const failurePenalty = failureRate * 40;
    rawConsistency = Math.max(0, rawConsistency - failurePenalty);

    // Confidence weight: 1 match → 50 (unknown), 4+ → fully trust
    // If n > 1 and iqr is 0, we can be more confident in consistency
    const baseConfidence = Math.min(1, (n - 1) / 3); 
    const perfectConsistencyBonus = (n > 1 && iqr === 0 && failureRate === 0) ? 1 : baseConfidence;
    const confidence = Math.max(baseConfidence, perfectConsistencyBonus);
    
    const consistencyScore = Math.round(confidence * rawConsistency + (1 - confidence) * 50);

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
