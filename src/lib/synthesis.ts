import { ScoutReport, RebuiltData } from './spr';

/**
 * Synthetic Data Generator
 * Performs Bayesian-style synthesis of multiple scout reports.
 * REBUILT 2026 Edition
 */

interface ScouterModel {
    scoutId: string;
    bias: number;
    variance: number;
}

export function synthesizeReports(
    reports: ScoutReport[],
    models: Record<string, ScouterModel>
): RebuiltData {
    if (reports.length === 0) throw new Error("No reports to synthesize");

    if (reports.length === 1 && !models[reports[0].scoutId]) {
        return reports[0].data;
    }

    // Helper: Weighted Mean for counts
    const weightedMean = (field: string, period: 'auto' | 'teleop') => {
        let totalWeight = 0;
        let weightedSum = 0;

        reports.forEach(r => {
            const m = models[r.scoutId] || { bias: 0, variance: 10 };
            const weight = 1 / Math.max(m.variance, 0.1);
            const val = (r.data as any)[period][field] as number;

            const debiasedVal = Math.max(0, val - m.bias);

            weightedSum += debiasedVal * weight;
            totalWeight += weight;
        });

        return weightedSum / totalWeight;
    };

    const synthetic: RebuiltData = {
        auto: {
            fuel_scored: weightedMean('fuel_scored', 'auto'),
            climb_level: synthesizeTowerLevel(reports, models, 'auto') as 'No Attempt' | 'Level1',
            moved: reports.some(r => r.data.auto.moved)
        },
        teleop: {
            fuel_scored: weightedMean('fuel_scored', 'teleop'),
            climb_level: synthesizeTowerLevel(reports, models, 'teleop') as 'No Attempt' | 'Level1' | 'Level2' | 'Level3'
        }
    };

    return synthetic;
}

function synthesizeTowerLevel(
    reports: ScoutReport[],
    models: Record<string, ScouterModel>,
    period: 'auto' | 'teleop'
): string {
    // Basic majority vote weighted by variance
    const votes: Record<string, number> = {};
    reports.forEach(r => {
        const m = models[r.scoutId] || { variance: 10 };
        const weight = 1 / Math.max(m.variance, 0.1);
        const level = (r.data as any)[period].climb_level;
        votes[level] = (votes[level] || 0) + weight;
    });

    return Object.entries(votes).sort((a, b) => b[1] - a[1])[0][0];
}
