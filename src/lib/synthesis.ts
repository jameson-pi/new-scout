import { ScoutReport, ReefscapeData } from './spr';

/**
 * Synthetic Data Generator
 * Performs Bayesian-style synthesis of multiple scout reports.
 */

interface ScouterModel {
    scoutId: string;
    bias: number;
    variance: number;
}

export function synthesizeReports(
    reports: ScoutReport[],
    models: Record<string, ScouterModel>
): ReefscapeData {
    if (reports.length === 0) throw new Error("No reports to synthesize");

    // If only one report and no model, use as placeholder
    if (reports.length === 1 && !models[reports[0].scoutId]) {
        return reports[0].data;
    }

    // We synthesize field by field. 
    // For Reefscape, fields are mostly counts (Discrete) or Climb state (Category).

    const synthetic: any = {
        auto: { moved: false },
        teleop: { climb: 'None' }
    };

    // Fields to synthesize (Numeric counts)
    const numericFields: Array<keyof ReefscapeData['auto'] | keyof ReefscapeData['teleop']> = [
        'coral_l1', 'coral_l2', 'coral_l3', 'coral_l4', 'algae_processor', 'algae_net'
    ];

    // Helper: Weighted Mean for counts
    const weightedMean = (field: string, period: 'auto' | 'teleop') => {
        let totalWeight = 0;
        let weightedSum = 0;

        reports.forEach(r => {
            const m = models[r.scoutId] || { bias: 0, variance: 10 }; // Default high variance if unknown
            const weight = 1 / Math.max(m.variance, 0.1);
            const val = (r.data as any)[period][field] as number;

            // Debiasing: val - bias (simplified linear debias)
            const debiasedVal = Math.max(0, val - m.bias);

            weightedSum += debiasedVal * weight;
            totalWeight += weight;
        });

        return weightedSum / totalWeight;
    };

    // Build the synthetic data object
    synthetic.auto = {
        coral_l1: weightedMean('coral_l1', 'auto'),
        coral_l2: weightedMean('coral_l2', 'auto'),
        coral_l3: weightedMean('coral_l3', 'auto'),
        coral_l4: weightedMean('coral_l4', 'auto'),
        algae_processor: weightedMean('algae_processor', 'auto'),
        algae_net: weightedMean('algae_net', 'auto'),
        moved: reports.some(r => r.data.auto.moved) // Logical OR for moved
    };

    synthetic.teleop = {
        coral_l1: weightedMean('coral_l1', 'teleop'),
        coral_l2: weightedMean('coral_l2', 'teleop'),
        coral_l3: weightedMean('coral_l3', 'teleop'),
        coral_l4: weightedMean('coral_l4', 'teleop'),
        algae_processor: weightedMean('algae_processor', 'teleop'),
        algae_net: weightedMean('algae_net', 'teleop'),
        climb: synthesizeClimb(reports, models)
    };

    return synthetic as ReefscapeData;
}

function synthesizeClimb(reports: ScoutReport[], models: Record<string, ScouterModel>): ReefscapeData['teleop']['climb'] {
    // Basic majority vote weighted by variance
    const votes: Record<string, number> = {};
    reports.forEach(r => {
        const m = models[r.scoutId] || { variance: 10 };
        const weight = 1 / Math.max(m.variance, 0.1);
        const climb = r.data.teleop.climb;
        votes[climb] = (votes[climb] || 0) + weight;
    });

    return Object.entries(votes).sort((a, b) => b[1] - a[1])[0][0] as ReefscapeData['teleop']['climb'];
}
