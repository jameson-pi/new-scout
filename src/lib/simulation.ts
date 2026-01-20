import { ReefscapeData } from './spr';

/**
 * Monte Carlo Event Simulator
 * Performs 10,000 iterations per match to predict ranking outcomes.
 */

export interface SimulatedMatch {
    matchKey: string;
    red: string[]; // Team keys
    blue: string[];
}

export interface TeamPerformanceDistribution {
    teamKey: string;
    pastSyntheticMatches: ReefscapeData[];
}

export interface SimResult {
    teamKey: string;
    avgRP: number;
    rankDistribution: Record<number, number>; // rank -> count of times achieved
    expectedRank: number;
}

const ITERATIONS = 10000;

/**
 * Runs the Monte Carlo simulation for a given set of remaining matches.
 */
export function runSimulation(
    teams: TeamPerformanceDistribution[],
    matches: SimulatedMatch[],
    currentRPs: Record<string, number>,
    matchLimit: number = 999 // Current "time" in the event
): SimResult[] {
    const teamStats: Record<string, { totalRP: number, ranks: number[] }> = {};
    const teamList = teams.map(t => t.teamKey);

    teamList.forEach(tk => {
        teamStats[tk] = { totalRP: 0, ranks: [] };
    });

    // Separate matches into "played" and "remaining" based on matchLimit
    const playedMatches = matches.filter(m => getMatchNumber(m.matchKey) <= matchLimit);
    const remainingMatches = matches.filter(m => getMatchNumber(m.matchKey) > matchLimit);

    // Run 10,000 iterations
    for (let i = 0; i < ITERATIONS; i++) {
        const iterationRPs: Record<string, number> = { ...currentRPs };

        // 1. Process Remaining Matches (Monte Carlo)
        remainingMatches.forEach(match => {
            const redResult = simulateAlliance(match.red, teams);
            const blueResult = simulateAlliance(match.blue, teams);
            processMatchOutcome(iterationRPs, match, redResult, blueResult);
        });

        // Rank teams for this iteration
        const ranked = Object.entries(iterationRPs)
            .sort((a, b) => b[1] - a[1]) // Primary: RP
            .map(([tk]) => tk);

        ranked.forEach((tk, index) => {
            if (teamStats[tk]) {
                teamStats[tk].totalRP += iterationRPs[tk];
                teamStats[tk].ranks.push(index + 1);
            }
        });
    }

    // Aggregate Results
    return Object.entries(teamStats).map(([tk, stats]) => {
        const rankDist: Record<number, number> = {};
        stats.ranks.forEach(r => rankDist[r] = (rankDist[r] || 0) + 1);

        return {
            teamKey: tk,
            avgRP: stats.totalRP / ITERATIONS,
            rankDistribution: rankDist,
            expectedRank: stats.ranks.reduce((a, b) => a + b, 0) / ITERATIONS
        };
    }).sort((a, b) => a.expectedRank - b.expectedRank);
}

function getMatchNumber(matchKey: string): number {
    return parseInt(matchKey.split('_qm').pop() || '0');
}

function processMatchOutcome(iterationRPs: Record<string, number>, match: SimulatedMatch, red: any, blue: any) {
    if (red.score > blue.score) {
        match.red.forEach(t => iterationRPs[t] = (iterationRPs[t] || 0) + 2);
    } else if (blue.score > red.score) {
        match.blue.forEach(t => iterationRPs[t] = (iterationRPs[t] || 0) + 2);
    } else {
        match.red.forEach(t => iterationRPs[t] = (iterationRPs[t] || 0) + 1);
        match.blue.forEach(t => iterationRPs[t] = (iterationRPs[t] || 0) + 1);
    }
    applyBonusRPs(iterationRPs, match.red, red);
    applyBonusRPs(iterationRPs, match.blue, blue);
}

function calculateActualAllianceScore(teamKeys: string[], distributions: TeamPerformanceDistribution[]) {
    // In "Actual" mode, we just average the teams' performances or use the latest
    // For simplicity in the sim, we'll pick from their distributions (which are already filtered by time in the UI)
    return simulateAlliance(teamKeys, distributions);
}

function simulateAlliance(teamKeys: string[], distributions: TeamPerformanceDistribution[]) {
    // Pick one random past performance for each robot
    const performances = teamKeys.map(tk => {
        const dist = distributions.find(d => d.teamKey === tk);
        if (!dist || dist.pastSyntheticMatches.length === 0) {
            return fallbackPerformance();
        }
        return dist.pastSyntheticMatches[Math.floor(Math.random() * dist.pastSyntheticMatches.length)];
    });

    // Sum up points
    const AUTO = { l1: 3, l2: 4, l3: 6, l4: 7, proc: 6, net: 4 };
    const TELE = { l1: 2, l2: 3, l3: 4, l4: 5, proc: 6, net: 4 };
    const CLIMB = { Deep: 12, Shallow: 6, Park: 2, None: 0 };

    let score = 0;
    let totalCoral = 0;
    let totalAlgae = 0;

    performances.forEach(p => {
        score += p.auto.coral_l1 * AUTO.l1 + p.auto.coral_l2 * AUTO.l2 + p.auto.coral_l3 * AUTO.l3 + p.auto.coral_l4 * AUTO.l4;
        score += p.auto.algae_processor * AUTO.proc + p.auto.algae_net * AUTO.net;
        if (p.auto.moved) score += 3;

        score += p.teleop.coral_l1 * TELE.l1 + p.teleop.coral_l2 * TELE.l2 + p.teleop.coral_l3 * TELE.l3 + p.teleop.coral_l4 * TELE.l4;
        score += p.teleop.algae_processor * TELE.proc + p.teleop.algae_net * TELE.net;
        score += CLIMB[p.teleop.climb] || 0;

        totalCoral += p.auto.coral_l1 + p.auto.coral_l2 + p.auto.coral_l3 + p.auto.coral_l4 + p.teleop.coral_l1 + p.teleop.coral_l2 + p.teleop.coral_l3 + p.teleop.coral_l4;
        totalAlgae += p.auto.algae_processor + p.auto.algae_net + p.teleop.algae_processor + p.teleop.algae_net;
    });

    return { score, totalCoral, totalAlgae, performances };
}

function applyBonusRPs(iterationRPs: Record<string, number>, teamKeys: string[], result: any) {
    if (result.totalCoral >= 15) {
        teamKeys.forEach(t => iterationRPs[t] = (iterationRPs[t] || 0) + 1);
    }
    if (result.totalAlgae >= 8) {
        teamKeys.forEach(t => iterationRPs[t] = (iterationRPs[t] || 0) + 1);
    }
}

function fallbackPerformance(): ReefscapeData {
    return {
        auto: { coral_l1: 0, coral_l2: 0, coral_l3: 0, coral_l4: 0, algae_processor: 0, algae_net: 0, moved: true },
        teleop: { coral_l1: 2, coral_l2: 0, coral_l3: 0, coral_l4: 0, algae_processor: 0, algae_net: 0, climb: 'Park' }
    };
}
