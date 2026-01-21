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
    avgError: number;
    variance: number;
    bias: number;
    spr: number;
    // Category Diagnostics
    autoError: number;
    teleError: number;
    endgameError: number;
}

/**
 * Calculates SPR for a list of scouts based on match data.
 */
export function calculateSPR(reports: ScoutReport[], tbaMatches: Record<string, TBAMatchResult>): ScouterStats[] {
    const scouterErrors: Record<string, { total: number[], auto: number[], tele: number[], endgame: number[] }> = {};

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

        if (!tbaMatch || !tbaMatch.alliances) continue;

        const robots: Record<string, ScoutReport[]> = {};
        allianceReports.forEach(r => {
            if (!robots[r.teamKey]) robots[r.teamKey] = [];
            robots[r.teamKey].push(r);
        });

        const teamKeys = Object.keys(robots);
        if (teamKeys.length !== 3) continue;

        const combinations: ScoutReport[][] = cartesian([
            robots[teamKeys[0]],
            robots[teamKeys[1]],
            robots[teamKeys[2]]
        ]);

        const actual = tbaMatch.alliances[allianceColor as 'red' | 'blue'];
        const actualTotal = actual.score;

        // Points Mapping for diagnostics
        const POINTS = {
            auto: { l1: 3, l2: 4, l3: 6, l4: 7, proc: 6, net: 4, moved: 3 },
            tele: { l1: 2, l2: 3, l3: 4, l4: 5, proc: 6, net: 4 },
            climb: { Deep: 12, Shallow: 6, Park: 2, None: 0 }
        };

        combinations.forEach(combo => {
            let reportedAuto = 0;
            let reportedTele = 0;
            let reportedEndgame = 0;

            combo.forEach(r => {
                const d = r.data;
                // Auto
                reportedAuto += d.auto.coral_l1 * POINTS.auto.l1;
                reportedAuto += d.auto.coral_l2 * POINTS.auto.l2;
                reportedAuto += d.auto.coral_l3 * POINTS.auto.l3;
                reportedAuto += d.auto.coral_l4 * POINTS.auto.l4;
                reportedAuto += d.auto.algae_processor * POINTS.auto.proc;
                reportedAuto += d.auto.algae_net * POINTS.auto.net;
                if (d.auto.moved) reportedAuto += POINTS.auto.moved;

                // Teleop
                reportedTele += d.teleop.coral_l1 * POINTS.tele.l1;
                reportedTele += d.teleop.coral_l2 * POINTS.tele.l2;
                reportedTele += d.teleop.coral_l3 * POINTS.tele.l3;
                reportedTele += d.teleop.coral_l4 * POINTS.tele.l4;
                reportedTele += d.teleop.algae_processor * POINTS.tele.proc;
                reportedTele += d.teleop.algae_net * POINTS.tele.net;

                // Endgame
                reportedEndgame += POINTS.climb[d.teleop.climb] || 0;
            });

            const totalError = (reportedAuto + reportedTele + reportedEndgame) - actualTotal;
            // Note: We don't have per-category actuals in the simplified TBAMatchResult yet, 
            // but we'll use the breakdown if we can. For now, estimate delta.
            const autoError = Math.abs(reportedAuto - (actual.autoPoints || 0));
            const teleError = Math.abs(reportedTele - (actual.teleopPoints || 0));
            const endgameError = Math.abs(reportedEndgame - (actual.endgamePoints || 0));

            combo.forEach(r => {
                if (!scouterErrors[r.scoutId]) {
                    scouterErrors[r.scoutId] = { total: [], auto: [], tele: [], endgame: [] };
                }
                scouterErrors[r.scoutId].total.push(totalError);
                scouterErrors[r.scoutId].auto.push(autoError);
                scouterErrors[r.scoutId].tele.push(teleError);
                scouterErrors[r.scoutId].endgame.push(endgameError);
            });
        });
    }

    // 4. Compute Stats
    const results: ScouterStats[] = [];
    for (const [scoutId, errs] of Object.entries(scouterErrors)) {
        const n = errs.total.length;
        const sumError = errs.total.reduce((a, b) => a + b, 0);
        const avgBias = sumError / n;

        const mae = errs.total.reduce((sum, err) => sum + Math.abs(err), 0) / n;
        const autoMae = errs.auto.reduce((sum, err) => sum + err, 0) / n;
        const teleMae = errs.tele.reduce((sum, err) => sum + err, 0) / n;
        const endgameMae = errs.endgame.reduce((sum, err) => sum + err, 0) / n;

        results.push({
            scoutId,
            matchesScouted: n,
            avgError: mae,
            bias: avgBias,
            variance: errs.total.reduce((sum, err) => sum + Math.pow(err - avgBias, 2), 0) / n,
            spr: mae,
            autoError: autoMae,
            teleError: teleMae,
            endgameError: endgameMae
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
