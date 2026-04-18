import { RebuiltData, ScoutReport, TBAMatchResult, ScouterStats } from './types/scouting';

// Scout Precision Ranking (SPR) Algorithm
// REBUILT 2026 Edition

// REBUILT 2026 Scoring Constants
const POINTS = {
    auto: { fuel: 1, tower_Level1: 15, moved: 3 },
    tele: { fuel: 1, tower_Level1: 10, tower_Level2: 20, tower_Level3: 30 }
};

function getTowerPoints(level: string, phase: 'auto' | 'tele'): number {
    if (phase === 'auto') {
        if (level === 'Level1') return POINTS.auto.tower_Level1;
        return 0;
    }
    if (level === 'Level1') return POINTS.tele.tower_Level1;
    if (level === 'Level2') return POINTS.tele.tower_Level2;
    if (level === 'Level3') return POINTS.tele.tower_Level3;
    return 0;
}

/**
 * Calculates SPR for a list of scouts based on match data.
 */
export function calculateSPR(reports: ScoutReport[], tbaMatches: Record<string, TBAMatchResult>): ScouterStats[] {
    const scouterErrors: Record<string, { total: number[], auto: number[], tele: number[], endgame: number[] }> = {};
    const noteLengths: Record<string, number[]> = {};

    // Group reports by Match + Alliance
    const reportsByMatchAlliance: Record<string, ScoutReport[]> = {};

    reports.forEach(r => {
        if (!noteLengths[r.scoutId]) noteLengths[r.scoutId] = [];
        noteLengths[r.scoutId].push(r.data.notes?.trim().length || 0);

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

        combinations.forEach(combo => {
            let reportedAuto = 0;
            let reportedTele = 0;
            let reportedEndgame = 0;

            combo.forEach(r => {
                const d = r.data;
                // Auto
                reportedAuto += d.auto.fuel_scored * POINTS.auto.fuel;
                reportedAuto += getTowerPoints(d.auto.climb_level, 'auto');
                if (d.auto.moved) reportedAuto += POINTS.auto.moved;

                // Teleop (fuel only, tower is endgame)
                reportedTele += d.teleop.fuel_scored * POINTS.tele.fuel;

                // Endgame (Tower climb)
                reportedEndgame += getTowerPoints(d.teleop.climb_level, 'tele');
            });

            const totalError = (reportedAuto + reportedTele + reportedEndgame) - actualTotal;
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

        const notes = noteLengths[scoutId] || [];
        const avgNoteLength = notes.length ? notes.reduce((a, b) => a + b, 0) / notes.length : 0;

        results.push({
            scoutId,
            matchesScouted: n,
            avgError: mae,
            bias: avgBias,
            variance: errs.total.reduce((sum, err) => sum + Math.pow(err - avgBias, 2), 0) / n,
            spr: mae,
            autoError: autoMae,
            teleError: teleMae,
            endgameError: endgameMae,
            otherDataLength: avgNoteLength
        });
    }

    return results.sort((a, b) => a.spr - b.spr);
}

/**
 * Calculates estimated EPA for a team.
 * When scouterStats are provided each report is weighted by the inverse of
 * its scouter's SPR (Mean Absolute Error), so more-accurate scouts carry
 * more weight in the average.  Falls back to equal weighting when stats are
 * unavailable or when a scouter has no SPR data yet.
 */
export function calculateTeamEPA(reports: ScoutReport[], scouterStats?: ScouterStats[]): number {
    if (reports.length === 0) return 0;

    let totalWeightedPoints = 0;
    let totalWeight = 0;

    reports.forEach(r => {
        const d = r.data;
        const points =
            d.auto.fuel_scored * POINTS.auto.fuel +
            getTowerPoints(d.auto.climb_level, 'auto') +
            (d.auto.moved ? POINTS.auto.moved : 0) +
            d.teleop.fuel_scored * POINTS.tele.fuel +
            getTowerPoints(d.teleop.climb_level, 'tele');

        // Weight = 1 / (SPR + 0.5) so that a near-perfect scout (SPR≈0)
        // gets ~2× weight while an inaccurate scout (SPR=5) gets ~0.17× weight.
        let weight = 1;
        if (scouterStats && scouterStats.length > 0) {
            const stats = scouterStats.find(s => s.scoutId === r.scoutId);
            if (stats !== undefined) {
                weight = 1 / (stats.spr + 0.5);
            }
        }

        totalWeightedPoints += points * weight;
        totalWeight += weight;
    });

    return totalWeight > 0 ? totalWeightedPoints / totalWeight : 0;
}

// Helper: Cartesian Product
function cartesian<T>(arrays: T[][]): T[][] {
    return arrays.reduce<T[][]>((a, b) => {
        return a.flatMap(d => b.map(e => [d, e].flat() as T[]));
    }, [[]] as T[][]);
}
