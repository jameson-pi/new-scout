// Scout Precision Ranking (SPR) Algorithm
// Reefscape 2025 Edition

export interface ReefscapeData {
    auto: {
        coral_l1: number;
        coral_l2: number;
        coral_l3: number;
        coral_l4: number;
        algae_processor: number;
        algae_net: number;
        moved: boolean;
    };
    teleop: {
        coral_l1: number;
        coral_l2: number;
        coral_l3: number;
        coral_l4: number;
        algae_processor: number;
        algae_net: number;
        climb: 'None' | 'Park' | 'Shallow' | 'Deep';
    };
    notes?: string;
    mech_failure?: boolean;
    defender_rating?: number;
    algae_removed?: number;
    coral_source?: 'Floor' | 'Station' | 'Both';
    climb_speed?: 'Fast' | 'Normal' | 'Slow' | 'Failed';
}

export interface ScoutReport {
    scoutId: string;
    matchKey: string;
    teamKey: string;
    alliance: 'red' | 'blue';
    data: ReefscapeData;
}

interface TBAMatchResult {
    matchKey: string;
    alliances: {
        red: { score: number; autoPoints: number; teleopPoints: number; endgamePoints: number };
        blue: { score: number; autoPoints: number; teleopPoints: number; endgamePoints: number };
    };
}

interface ScouterStats {
    scoutId: string;
    matchesScouted: number;
    avgError: number; // raw average error
    variance: number;
    bias: number; // + means overcounting, - means undercounting
    spr: number; // Final score (lower is better)
}

/**
 * Calculates SPR for a list of scouts based on match data.
 */
export function calculateSPR(reports: ScoutReport[], tbaMatches: Record<string, TBAMatchResult>): ScouterStats[] {
    const scouterErrors: Record<string, number[]> = {};

    // Group reports by Match + Alliance
    const reportsByMatchAlliance: Record<string, ScoutReport[]> = {};

    reports.forEach(r => {
        const key = `${r.matchKey}::${r.alliance}`;
        if (!reportsByMatchAlliance[key]) reportsByMatchAlliance[key] = [];
        reportsByMatchAlliance[key].push(r);
    });

    // Iterate over each match/alliance combo
    for (const [key, allianceReports] of Object.entries(reportsByMatchAlliance)) {
        const [matchKey, allianceColor] = key.split('::');
        const tbaMatch = tbaMatches[matchKey];

        // Skip if match not found in TBA (prevents crash on undefined alliances)
        if (!tbaMatch || !tbaMatch.alliances) continue;

        // We need exactly 3 robot reports (one per robot) to form a complete "Alliance View"
        // In reality, we have 2 scouts per robot = 6 reports.
        // The prompt says: "Take all possible combinations of the 3 robots' reported scores"

        // 1. Group by Robot (Team)
        const robots: Record<string, ScoutReport[]> = {};
        allianceReports.forEach(r => {
            if (!robots[r.teamKey]) robots[r.teamKey] = [];
            robots[r.teamKey].push(r);
        });

        const teamKeys = Object.keys(robots);
        if (teamKeys.length !== 3) continue; // Incomplete data for this alliance, skip

        // 2. Generate all combinations (Cartesian product of scouts per robot)
        // If Robot A has 2 scouts, Robot B has 2, Robot C has 2 -> 2*2*2 = 8 combinations
        const combinations: ScoutReport[][] = cartesian([
            robots[teamKeys[0]],
            robots[teamKeys[1]],
            robots[teamKeys[2]]
        ]);

        // 3. Compare each combination to TBA Actuals
        const actual = tbaMatch.alliances[allianceColor as 'red' | 'blue'];
        const actualTotal = actual.score;

        // Reefscape Scoring Weights (Based on 2025 Manual Estimates)
        const POINTS = {
            auto: { l1: 3, l2: 4, l3: 6, l4: 7, proc: 6, net: 4, moved: 3 },
            tele: { l1: 2, l2: 3, l3: 4, l4: 5, proc: 6, net: 4 },
            climb: { Deep: 12, Shallow: 6, Park: 2, None: 0 }
        };

        combinations.forEach(combo => {
            const reportedTotal = combo.reduce((sum, r) => {
                const d = r.data;
                let s = 0;
                // Auto
                s += d.auto.coral_l1 * POINTS.auto.l1;
                s += d.auto.coral_l2 * POINTS.auto.l2;
                s += d.auto.coral_l3 * POINTS.auto.l3;
                s += d.auto.coral_l4 * POINTS.auto.l4;
                s += d.auto.algae_processor * POINTS.auto.proc;
                s += d.auto.algae_net * POINTS.auto.net;
                if (d.auto.moved) s += POINTS.auto.moved;

                // Teleop
                s += d.teleop.coral_l1 * POINTS.tele.l1;
                s += d.teleop.coral_l2 * POINTS.tele.l2;
                s += d.teleop.coral_l3 * POINTS.tele.l3;
                s += d.teleop.coral_l4 * POINTS.tele.l4;
                s += d.teleop.algae_processor * POINTS.tele.proc;
                s += d.teleop.algae_net * POINTS.tele.net;
                s += POINTS.climb[d.teleop.climb] || 0;

                return sum + s;
            }, 0);

            const error = reportedTotal - actualTotal;

            // Attribute this error to ALL scouts in this combination
            combo.forEach(r => {
                if (!scouterErrors[r.scoutId]) scouterErrors[r.scoutId] = [];
                scouterErrors[r.scoutId].push(error);
            });
        });
    }

    // 4. Compute Stats
    const results: ScouterStats[] = [];
    for (const [scoutId, errors] of Object.entries(scouterErrors)) {
        const n = errors.length;
        const sumError = errors.reduce((a, b) => a + b, 0);
        const avgBias = sumError / n;

        // Variance
        const variance = errors.reduce((sum, err) => sum + Math.pow(err - avgBias, 2), 0) / n;

        // SPR: The prompt says "Average of all per-match errors". 
        // Using Mean Absolute Error (MAE) is likely what they mean by "2.3 is typical" (magnitude of error).
        // Bias cancels out in simple average (average error might be 0 if -5 and +5), so MAE is better for "Precision".
        const mae = errors.reduce((sum, err) => sum + Math.abs(err), 0) / n;

        results.push({
            scoutId,
            matchesScouted: n, // Technically 'combinations participating in'
            avgError: mae,
            bias: avgBias,
            variance,
            spr: mae // Using MAE as the SPR score
        });
    }

    return results.sort((a, b) => a.spr - b.spr);
}

// Helper: Cartesian Product
function cartesian<T>(arrays: T[][]): T[][] {
    return arrays.reduce<T[][]>((a, b) => {
        return a.flatMap(d => b.map(e => [d, e].flat() as T[]));
    }, [[]] as T[][]);
}
