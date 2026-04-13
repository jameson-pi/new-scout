import { exportAllTeamsAction } from './actions';
import { getAllPitReports, getEventSchedule, getMissionData } from './data';
import { predictUpcomingMatches } from './predictions';
import { TeamPerformanceDistribution } from './simulation';
import { getStatboticsEvent } from './statbotics';
import { getEventRankings, getEventTeams } from './tba';
import { ScoutReport } from './spr';

export interface EventExportBundle {
    eventKey: string;
    generatedAt: string;
    teams: Awaited<ReturnType<typeof exportAllTeamsAction>>;
    reports: Awaited<ReturnType<typeof getMissionData>>['reports'];
    pitReports: Awaited<ReturnType<typeof getAllPitReports>>;
    schedule: Awaited<ReturnType<typeof getEventSchedule>>;
    rankings: Awaited<ReturnType<typeof getEventRankings>>;
    tbaTeams: Awaited<ReturnType<typeof getEventTeams>>;
    tbaMatches: Awaited<ReturnType<typeof getMissionData>>['tbaMatchesRaw'];
    statbotics: Awaited<ReturnType<typeof getStatboticsEvent>>;
    predictions: ReturnType<typeof predictUpcomingMatches>;
    summary: {
        totalTeams: number;
        totalReports: number;
        totalPitReports: number;
        totalMatchesScheduled: number;
        lastScoutedMatch: number;
    };
}

function getMatchNumber(matchKey: string): number {
    return parseInt(matchKey.split('_qm').pop() || '0', 10) || 0;
}

export async function buildEventExportBundle(eventKey: string): Promise<EventExportBundle> {
    const [missionData, teams, pitReports, schedule, rankings, tbaTeams, statbotics] = await Promise.all([
        getMissionData(eventKey),
        exportAllTeamsAction(eventKey),
        getAllPitReports(eventKey),
        getEventSchedule(eventKey),
        getEventRankings(eventKey),
        getEventTeams(eventKey),
        getStatboticsEvent(eventKey),
    ]);

    const reportsByTeam = new Map<string, ScoutReport[]>();
    missionData.reports.forEach((report: ScoutReport) => {
        const bucket = reportsByTeam.get(report.teamKey);
        if (bucket) bucket.push(report);
        else reportsByTeam.set(report.teamKey, [report]);
    });

    const allTeamKeys = Array.from(new Set([
        ...teams.map((t: { teamNumber: number }) => `frc${t.teamNumber}`),
        ...missionData.reports.map((r: ScoutReport) => r.teamKey),
        ...(Array.isArray(tbaTeams) ? tbaTeams.map((t: { key: string }) => t.key) : []),
    ]));

    const distributions: TeamPerformanceDistribution[] = allTeamKeys.map((teamKey) => ({
        teamKey,
        pastSyntheticMatches: (reportsByTeam.get(teamKey) ?? []).map((r: ScoutReport) => r.data),
    }));

    const simulatedSchedule = schedule.map((m: { key: string; red: string[]; blue: string[] }) => ({
        matchKey: m.key,
        red: m.red,
        blue: m.blue,
    }));

    const lastScoutedMatch = missionData.reports.reduce((max: number, report: ScoutReport) => {
        return Math.max(max, getMatchNumber(report.matchKey));
    }, 0);

    const predictions = predictUpcomingMatches(simulatedSchedule, distributions, lastScoutedMatch);

    return {
        eventKey,
        generatedAt: new Date().toISOString(),
        teams,
        reports: missionData.reports,
        pitReports,
        schedule,
        rankings,
        tbaTeams,
        tbaMatches: missionData.tbaMatchesRaw,
        statbotics,
        predictions,
        summary: {
            totalTeams: teams.length,
            totalReports: missionData.reports.length,
            totalPitReports: pitReports.length,
            totalMatchesScheduled: schedule.length,
            lastScoutedMatch,
        },
    };
}
