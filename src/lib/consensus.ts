/**
 * Scout Consensus Analysis
 * Identify where scouts disagree on team ratings
 * REBUILT 2026 Edition
 */

import { ScoutReport } from './spr';

export interface ConsensusMetric {
    teamKey: string;
    scouterCount: number;
    metrics: {
        field: string;
        mean: number;
        stdDev: number;
        variance: number;
        hasDisagreement: boolean;
    }[];
    overallConsensus: number; // 0-100
    flaggedMetrics: string[];
}

/**
 * Calculate consensus for a team across all scouts
 */
export function calculateConsensus(reports: ScoutReport[]): ConsensusMetric {
    if (reports.length === 0) {
        return {
            teamKey: '',
            scouterCount: 0,
            metrics: [],
            overallConsensus: 100,
            flaggedMetrics: []
        };
    }

    const teamKey = reports[0].teamKey;
    const scouters = new Set(reports.map(r => r.scoutId));

    // Fields to analyze (REBUILT 2026)
    const fields = [
        { name: 'Auto Fuel', getter: (r: ScoutReport) => r.data.auto.fuel_scored },
        { name: 'Teleop Fuel', getter: (r: ScoutReport) => r.data.teleop.fuel_scored },
        { name: 'Tower', getter: (r: ScoutReport) => {
            const levels: Record<string, number> = { None: 0, Level1: 1, Level2: 2, Level3: 3 };
            return levels[r.data.teleop.tower_level] || 0;
        }},
        { name: 'Defense', getter: (r: ScoutReport) => r.data.defender_rating || 0 },
    ];

    const metrics = fields.map(field => {
        const values = reports.map(r => field.getter(r));
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);

        // Flag if std dev > 50% of mean (high disagreement)
        const hasDisagreement = mean > 0 ? (stdDev / mean) > 0.5 : stdDev > 1;

        return {
            field: field.name,
            mean,
            stdDev,
            variance,
            hasDisagreement
        };
    });

    const flaggedMetrics = metrics.filter(m => m.hasDisagreement).map(m => m.field);
    const consensusScores: number[] = metrics.map(m => m.hasDisagreement ? 0 : 100);
    const overallConsensus = consensusScores.reduce((a, b) => a + b, 0) / consensusScores.length;

    return {
        teamKey,
        scouterCount: scouters.size,
        metrics,
        overallConsensus,
        flaggedMetrics
    };
}

/**
 * Get all teams with consensus issues
 */
export function getConsensusIssues(reports: ScoutReport[]): ConsensusMetric[] {
    const teamKeys = Array.from(new Set(reports.map(r => r.teamKey)));
    return teamKeys
        .map(tk => calculateConsensus(reports.filter(r => r.teamKey === tk)))
        .filter(c => c.flaggedMetrics.length > 0)
        .sort((a, b) => a.overallConsensus - b.overallConsensus);
}
