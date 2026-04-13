import { TeamPerformanceDistribution, SimulatedMatch } from './simulation';
import type { RebuiltData } from './types/scouting';


/**
 * Match Prediction Engine
 * Predicts individual match outcomes with confidence intervals
 * REBUILT 2026 Edition
 */

export interface MatchPrediction {
    matchKey: string;
    redTeams: string[];
    blueTeams: string[];
    redWinProbability: number;
    blueWinProbability: number;
    tieProbability: number;
    predictedWinner: 'red' | 'blue' | 'tie';
    confidence: 'high' | 'medium' | 'low';
    redScoreRange: { min: number; max: number; mean: number };
    blueScoreRange: { min: number; max: number; mean: number };
}

const PREDICTION_ITERATIONS = 1000;

// REBUILT 2026 Scoring Constants
const AUTO_FUEL = 1;
const TELE_FUEL = 1;
const AUTO_TOWER: Record<string, number> = { Level1: 15, None: 0 };
const TELE_TOWER: Record<string, number> = { Level1: 10, Level2: 20, Level3: 30, None: 0 };

/**
 * Predict the outcome of a single match
 */
export function predictMatch(
    match: SimulatedMatch,
    distributions: TeamPerformanceDistribution[]
): MatchPrediction {
    let redWins = 0;
    let blueWins = 0;
    let ties = 0;
    const redScores: number[] = [];
    const blueScores: number[] = [];

    for (let i = 0; i < PREDICTION_ITERATIONS; i++) {
        const redScore = simulateAllianceScore(match.red, distributions);
        const blueScore = simulateAllianceScore(match.blue, distributions);

        redScores.push(redScore);
        blueScores.push(blueScore);

        if (redScore > blueScore) redWins++;
        else if (blueScore > redScore) blueWins++;
        else ties++;
    }

    const redWinProb = redWins / PREDICTION_ITERATIONS;
    const blueWinProb = blueWins / PREDICTION_ITERATIONS;
    const tieProb = ties / PREDICTION_ITERATIONS;

    let predictedWinner: 'red' | 'blue' | 'tie' = 'tie';
    if (redWinProb > blueWinProb && redWinProb > tieProb) predictedWinner = 'red';
    else if (blueWinProb > redWinProb && blueWinProb > tieProb) predictedWinner = 'blue';

    const maxProb = Math.max(redWinProb, blueWinProb, tieProb);
    const confidence = maxProb > 0.7 ? 'high' : maxProb > 0.5 ? 'medium' : 'low';

    return {
        matchKey: match.matchKey,
        redTeams: match.red,
        blueTeams: match.blue,
        redWinProbability: redWinProb,
        blueWinProbability: blueWinProb,
        tieProbability: tieProb,
        predictedWinner,
        confidence,
        redScoreRange: {
            min: Math.min(...redScores),
            max: Math.max(...redScores),
            mean: redScores.reduce((a, b) => a + b, 0) / redScores.length
        },
        blueScoreRange: {
            min: Math.min(...blueScores),
            max: Math.max(...blueScores),
            mean: blueScores.reduce((a, b) => a + b, 0) / blueScores.length
        }
    };
}

/**
 * Simulate alliance score (REBUILT 2026)
 */
function simulateAllianceScore(teamKeys: string[], distributions: TeamPerformanceDistribution[]): number {
    let score = 0;

    teamKeys.forEach(tk => {
        const dist = distributions.find(d => d.teamKey === tk);
        if (!dist || dist.pastSyntheticMatches.length === 0) return;

        const p = dist.pastSyntheticMatches[Math.floor(Math.random() * dist.pastSyntheticMatches.length)];

        // Auto
        score += p.auto.fuel_scored * AUTO_FUEL;
        score += AUTO_TOWER[p.auto.climb_level] || 0;
        if (p.auto.moved) score += 3;

        // Teleop
        score += p.teleop.fuel_scored * TELE_FUEL;

        // Endgame (Tower)
        score += TELE_TOWER[p.teleop.climb_level] || 0;
    });

    return score;
}

/**
 * Predict all upcoming matches
 */
export function predictUpcomingMatches(
    matches: SimulatedMatch[],
    distributions: TeamPerformanceDistribution[],
    currentMatchLimit: number
): MatchPrediction[] {
    return matches
        .filter(m => {
            const matchNum = parseInt(m.matchKey.split('_qm').pop() || '0');
            return matchNum > currentMatchLimit;
        })
        .map(m => predictMatch(m, distributions));
}
