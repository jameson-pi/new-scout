/**
 * What-If Scenario Analysis
 * Simulate hypothetical match outcomes
 */

import { runSimulation, TeamPerformanceDistribution, SimulatedMatch, SimResult } from './simulation';

export interface Scenario {
    name: string;
    overrides: MatchOverride[];
}

export interface MatchOverride {
    matchKey: string;
    redWins?: boolean;
    redRPs?: number;
    blueRPs?: number;
}

export interface ScenarioResult {
    scenarioName: string;
    rankingChanges: RankChange[];
    topTeamRanks: { teamKey: string; expectedRank: number }[];
}

export interface RankChange {
    teamKey: string;
    baselineRank: number;
    scenarioRank: number;
    delta: number;
}

/**
 * Run a what-if scenario and compare to baseline
 */
export function runScenario(
    scenario: Scenario,
    distributions: TeamPerformanceDistribution[],
    schedule: SimulatedMatch[],
    baselineRPs: Record<string, number>,
    matchLimit: number
): ScenarioResult {
    // Apply overrides to RPs
    const modifiedRPs = { ...baselineRPs };

    scenario.overrides.forEach(override => {
        const match = schedule.find(m => m.matchKey === override.matchKey);
        if (!match) return;

        if (override.redWins !== undefined) {
            const rps = override.redWins ? 3 : 0;
            match.red.forEach(t => modifiedRPs[t] = (modifiedRPs[t] || 0) + rps);
            match.blue.forEach(t => modifiedRPs[t] = (modifiedRPs[t] || 0) + (override.redWins ? 0 : 3));
        }

        if (override.redRPs !== undefined) {
            match.red.forEach(t => modifiedRPs[t] = (modifiedRPs[t] || 0) + override.redRPs!);
        }
        if (override.blueRPs !== undefined) {
            match.blue.forEach(t => modifiedRPs[t] = (modifiedRPs[t] || 0) + override.blueRPs!);
        }
    });

    // Run simulation with modified RPs
    const scenarioResults = runSimulation(distributions, schedule, modifiedRPs, matchLimit);
    const baselineResults = runSimulation(distributions, schedule, baselineRPs, matchLimit);

    // Calculate rank changes
    const rankingChanges: RankChange[] = baselineResults.map((baseTeam, i) => {
        const scenarioTeam = scenarioResults.find(s => s.teamKey === baseTeam.teamKey);
        const scenarioRank = scenarioTeam ? scenarioResults.indexOf(scenarioTeam) + 1 : i + 1;
        return {
            teamKey: baseTeam.teamKey,
            baselineRank: i + 1,
            scenarioRank,
            delta: (i + 1) - scenarioRank
        };
    }).filter(rc => rc.delta !== 0);

    return {
        scenarioName: scenario.name,
        rankingChanges: rankingChanges.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)),
        topTeamRanks: scenarioResults.slice(0, 10).map((t, i) => ({ teamKey: t.teamKey, expectedRank: i + 1 }))
    };
}

/**
 * Create common scenario templates
 */
export function createScenarioTemplates(ourTeamKey: string, schedule: SimulatedMatch[]): Scenario[] {
    const ourMatches = schedule.filter(m => m.red.includes(ourTeamKey) || m.blue.includes(ourTeamKey));

    return [
        {
            name: 'We Win All Remaining',
            overrides: ourMatches.map(m => ({
                matchKey: m.matchKey,
                redWins: m.red.includes(ourTeamKey)
            }))
        },
        {
            name: 'We Lose All Remaining',
            overrides: ourMatches.map(m => ({
                matchKey: m.matchKey,
                redWins: !m.red.includes(ourTeamKey)
            }))
        }
    ];
}
