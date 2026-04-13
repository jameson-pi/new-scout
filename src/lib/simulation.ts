import type { RebuiltData } from './types/scouting';


/**
 * Monte Carlo Event Simulator
 * Performs 10,000 iterations per match to predict ranking outcomes.
 * REBUILT 2026 Edition
 */

export interface SimulatedMatch {
    matchKey: string;
    red: string[]; // Team keys
    blue: string[];
}

export interface TeamPerformanceDistribution {
    teamKey: string;
    pastSyntheticMatches: RebuiltData[];
}

export interface SimResult {
    teamKey: string;
    avgRP: number;
    rankDistribution: Record<number, number>; // rank -> count of times achieved
    expectedRank: number;
}

const ITERATIONS = 10000;

// REBUILT 2026 Scoring Constants
const AUTO_FUEL = 1;
const TELE_FUEL = 1;
const AUTO_TOWER: Record<string, number> = { Level1: 15, 'No Attempt': 0 };
const TELE_TOWER: Record<string, number> = { Level1: 10, Level2: 20, Level3: 30, 'No Attempt': 0 };

/**
 * Runs the Monte Carlo simulation for a given set of remaining matches.
 */
export function runSimulation(
    teams: TeamPerformanceDistribution[],
    matches: SimulatedMatch[],
    currentRPs: Record<string, number>,
    matchLimit: number = 999
): SimResult[] {
    const teamStats: Record<string, { totalRP: number, ranks: number[] }> = {};
    const teamList = teams.map(t => t.teamKey);

    teamList.forEach(tk => {
        teamStats[tk] = { totalRP: 0, ranks: [] };
    });

    const playedMatches = matches.filter(m => getMatchNumber(m.matchKey) <= matchLimit);
    const remainingMatches = matches.filter(m => getMatchNumber(m.matchKey) > matchLimit);

    for (let i = 0; i < ITERATIONS; i++) {
        const iterationRPs: Record<string, number> = { ...currentRPs };

        remainingMatches.forEach(match => {
            const redResult = simulateAlliance(match.red, teams);
            const blueResult = simulateAlliance(match.blue, teams);
            processMatchOutcome(iterationRPs, match, redResult, blueResult);
        });

        const ranked = Object.entries(iterationRPs)
            .sort((a, b) => b[1] - a[1])
            .map(([tk]) => tk);

        ranked.forEach((tk, index) => {
            if (teamStats[tk]) {
                teamStats[tk].totalRP += iterationRPs[tk];
                teamStats[tk].ranks.push(index + 1);
            }
        });
    }

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
    // 2026 Rules: Win = 3 RPs, Tie = 1 RP
    if (red.score > blue.score) {
        match.red.forEach(t => iterationRPs[t] = (iterationRPs[t] || 0) + 3);
    } else if (blue.score > red.score) {
        match.blue.forEach(t => iterationRPs[t] = (iterationRPs[t] || 0) + 3);
    } else {
        match.red.forEach(t => iterationRPs[t] = (iterationRPs[t] || 0) + 1);
        match.blue.forEach(t => iterationRPs[t] = (iterationRPs[t] || 0) + 1);
    }
    applyBonusRPs(iterationRPs, match.red, red);
    applyBonusRPs(iterationRPs, match.blue, blue);
}

function simulateAlliance(teamKeys: string[], distributions: TeamPerformanceDistribution[]) {
    const performances = teamKeys.map(tk => {
        const dist = distributions.find(d => d.teamKey === tk);
        if (!dist || dist.pastSyntheticMatches.length === 0) {
            return fallbackPerformance();
        }
        return dist.pastSyntheticMatches[Math.floor(Math.random() * dist.pastSyntheticMatches.length)];
    });

    let score = 0;
    let totalFuel = 0;
    let towerPoints = 0;
    let robotsMoved = 0;
    let autoFuelScored = 0;

    performances.forEach(p => {
        // Auto scoring
        const autoFuel = p.auto.fuel_scored * AUTO_FUEL;
        const autoTower = AUTO_TOWER[p.auto.climb_level] || 0;
        score += autoFuel + autoTower;
        autoFuelScored += p.auto.fuel_scored;
        if (p.auto.moved) {
            score += 3; // Auto leave bonus
            robotsMoved++;
        }

        // Teleop scoring
        const teleFuel = p.teleop.fuel_scored * TELE_FUEL;
        score += teleFuel;

        // Endgame (Tower)
        const towerPts = TELE_TOWER[p.teleop.climb_level] || 0;
        score += towerPts;
        towerPoints += towerPts + autoTower;

        // Track total fuel
        totalFuel += p.auto.fuel_scored + p.teleop.fuel_scored;
    });

    return { score, totalFuel, towerPoints, robotsMoved, autoFuelScored, performances };
}

function applyBonusRPs(iterationRPs: Record<string, number>, teamKeys: string[], result: any) {
    // Energized RP: Score >= 100 total FUEL
    if (result.totalFuel >= 100) {
        teamKeys.forEach(t => iterationRPs[t] = (iterationRPs[t] || 0) + 1);
    }
    // Supercharged RP: Score >= 360 total FUEL
    if (result.totalFuel >= 360) {
        teamKeys.forEach(t => iterationRPs[t] = (iterationRPs[t] || 0) + 1);
    }
    // Traversal RP: >= 50 Tower points
    if (result.towerPoints >= 50) {
        teamKeys.forEach(t => iterationRPs[t] = (iterationRPs[t] || 0) + 1);
    }
}

function fallbackPerformance(): RebuiltData {
    return {
        auto: { fuel_scored: 5, climb_level: 'No Attempt', moved: true },
        teleop: { fuel_scored: 15, climb_level: 'Level1' }
    };
}
