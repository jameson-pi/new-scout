/**
 * RP Probability Calculator - 2026 REBUILT Rules
 *
 * Ranking Points in 2026 REBUILT:
 * 1. Win RP: 3 RPs for win, 1 for tie, 0 for loss
 * 2. Energized RP: Score >= 100 total FUEL
 * 3. Supercharged RP: Score >= 360 total FUEL
 * 4. Traversal RP: Alliance earns >= 50 total Tower points
 */

import { TeamPerformanceDistribution } from './simulation';

export interface RPProbability {
    matchKey: string;
    energizedRPProbability: number;     // >= 100 FUEL
    superchargedRPProbability: number;  // >= 360 FUEL
    traversalRPProbability: number;     // >= 50 Tower points
    winProbability: number;
    expectedRPs: number;
}

const ITERATIONS = 500;

// REBUILT 2026 Scoring Constants
const AUTO_FUEL = 1;
const TELE_FUEL = 1;
const AUTO_TOWER: Record<string, number> = { Level1: 15, 'No Attempt': 0 };
const TELE_TOWER: Record<string, number> = { Level1: 10, Level2: 20, Level3: 30, 'No Attempt': 0 };

/**
 * Calculate RP probabilities for a match
 */
export function calculateRPProbability(
    redTeams: string[],
    blueTeams: string[],
    distributions: TeamPerformanceDistribution[],
    alliance: 'red' | 'blue'
): RPProbability {
    let energizedRPCount = 0;
    let superchargedRPCount = 0;
    let traversalRPCount = 0;
    let winCount = 0;
    let tieCount = 0;

    for (let i = 0; i < ITERATIONS; i++) {
        const redResult = simulateAllianceForRP(redTeams, distributions);
        const blueResult = simulateAllianceForRP(blueTeams, distributions);

        const result = alliance === 'red' ? redResult : blueResult;
        const opponent = alliance === 'red' ? blueResult : redResult;

        // Energized RP: >= 100 total FUEL
        if (result.totalFuel >= 100) energizedRPCount++;

        // Supercharged RP: >= 360 total FUEL
        if (result.totalFuel >= 360) superchargedRPCount++;

        // Traversal RP: >= 50 Tower points
        if (result.towerPoints >= 50) traversalRPCount++;

        // Win/Tie
        if (result.score > opponent.score) winCount++;
        else if (result.score === opponent.score) tieCount++;
    }

    const energizedRPProbability = energizedRPCount / ITERATIONS;
    const superchargedRPProbability = superchargedRPCount / ITERATIONS;
    const traversalRPProbability = traversalRPCount / ITERATIONS;
    const winProbability = winCount / ITERATIONS;
    const tieProbability = tieCount / ITERATIONS;

    // Expected RPs: 3 for win, 1 for tie, 1 each for energized/supercharged/traversal bonus
    const expectedRPs =
        (winProbability * 3) +
        (tieProbability * 1) +
        (energizedRPProbability * 1) +
        (superchargedRPProbability * 1) +
        (traversalRPProbability * 1);

    return {
        matchKey: '',
        energizedRPProbability,
        superchargedRPProbability,
        traversalRPProbability,
        winProbability,
        expectedRPs
    };
}

interface SimResult {
    score: number;
    totalFuel: number;
    towerPoints: number;
}

function simulateAllianceForRP(teamKeys: string[], distributions: TeamPerformanceDistribution[]): SimResult {
    let score = 0;
    let totalFuel = 0;
    let towerPoints = 0;

    teamKeys.forEach(tk => {
        const dist = distributions.find(d => d.teamKey === tk);
        if (!dist || dist.pastSyntheticMatches.length === 0) return;

        const p = dist.pastSyntheticMatches[Math.floor(Math.random() * dist.pastSyntheticMatches.length)];

        // Auto scoring
        const autoFuel = p.auto.fuel_scored * AUTO_FUEL;
        const autoTower = AUTO_TOWER[p.auto.climb_level] || 0;
        score += autoFuel + autoTower;
        if (p.auto.moved) score += 3;

        // Teleop scoring
        const teleFuel = p.teleop.fuel_scored * TELE_FUEL;
        score += teleFuel;

        // Endgame (Tower)
        const teleTower = TELE_TOWER[p.teleop.climb_level] || 0;
        score += teleTower;

        // Track totals
        totalFuel += p.auto.fuel_scored + p.teleop.fuel_scored;
        towerPoints += autoTower + teleTower;
    });

    return { score, totalFuel, towerPoints };
}

/**
 * Calculate all RP probabilities for upcoming matches
 */
export function calculateMatchRPProbabilities(
    matchKey: string,
    redTeams: string[],
    blueTeams: string[],
    distributions: TeamPerformanceDistribution[],
    alliance: 'red' | 'blue'
): RPProbability {
    const result = calculateRPProbability(redTeams, blueTeams, distributions, alliance);
    result.matchKey = matchKey;
    return result;
}
