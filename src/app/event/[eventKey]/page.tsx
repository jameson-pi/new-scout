import { getMissionData, getEventSchedule } from '@/lib/data';
import { TeamPerformanceDistribution, SimulatedMatch } from '@/lib/simulation';
import { getEventTeams, getEventRankings } from '@/lib/tba';
import { getStatboticsEvent } from '@/lib/statbotics';
import EventDashboard from './EventDashboard';

interface EventTeamLite {
    key: string;
    nickname?: string;
    team_number?: number;
}

interface TbaQmMatchLite {
    key: string;
    comp_level?: string;
    alliances?: {
        red?: { team_keys?: string[] };
        blue?: { team_keys?: string[] };
    };
}

export default async function EventView({ params }: { params: Promise<{ eventKey: string }> }) {
    const { eventKey } = await params;

    const [{ reports, tbaMatches, tbaMatchesRaw }, eventTeamsRaw, actualRankings, statboticsData] = await Promise.all([
        getMissionData(eventKey),
        getEventTeams(eventKey),
        getEventRankings(eventKey),
        getStatboticsEvent(eventKey),
    ]);

    const eventTeams: EventTeamLite[] = Array.isArray(eventTeamsRaw) ? eventTeamsRaw : [];

    // Map team keys to nicknames
    const teamNameMap: Record<string, string> = {};
    eventTeams.forEach((t) => {
        teamNameMap[t.key] = t.nickname || String(t.team_number ?? t.key.replace('frc', ''));
    });

    // Group reports once to avoid repeated O(n) filters when building distributions.
    const reportsByTeam = new Map<string, typeof reports>();
    reports.forEach((report) => {
        const bucket = reportsByTeam.get(report.teamKey);
        if (bucket) bucket.push(report);
        else reportsByTeam.set(report.teamKey, [report]);
    });

    // Gather all team keys — from reports AND from the registered event roster
    const allTeamKeys = Array.from(
        new Set([
            ...Array.from(reportsByTeam.keys()),
            ...eventTeams.map((t) => t.key),
        ])
    );

    const distributions: TeamPerformanceDistribution[] = allTeamKeys.map((teamKey) => ({
        teamKey,
        pastSyntheticMatches: (reportsByTeam.get(teamKey) ?? []).map((r) => r.data),
    }));

    // Build schedule from TBA raw matches first (has team_keys when schedule is released)
    // Fall back to DB schedule, then to report-derived schedule.
    let schedule: SimulatedMatch[] = [];
    const tbaQmMatches = (Array.isArray(tbaMatchesRaw) ? tbaMatchesRaw : []).filter((m: TbaQmMatchLite) => m.comp_level === 'qm');

    if (tbaQmMatches.length > 0) {
        schedule = tbaQmMatches
            .map((m: TbaQmMatchLite) => ({
                matchKey: m.key,
                red: (m.alliances?.red?.team_keys ?? []).slice(0, 3),
                blue: (m.alliances?.blue?.team_keys ?? []).slice(0, 3),
            }))
            .filter((m: SimulatedMatch) => m.red.length === 3 && m.blue.length === 3)
            .sort((a: SimulatedMatch, b: SimulatedMatch) => {
                const numA = parseInt(a.matchKey.split('_qm')[1]) || 0;
                const numB = parseInt(b.matchKey.split('_qm')[1]) || 0;
                return numA - numB;
            });
    }

    if (schedule.length === 0) {
        const dbSchedule = await getEventSchedule(eventKey);
        schedule = dbSchedule
            .map((m: { key: string; red: string[]; blue: string[] }) => ({
                matchKey: m.key,
                red: m.red,
                blue: m.blue,
            }))
            .filter((m: SimulatedMatch) => m.red.length === 3 && m.blue.length === 3);
    }

    if (schedule.length === 0) {
        schedule = Object.values(tbaMatches)
            .map((m: { matchKey: string }) => {
                const redTeams = Array.from(new Set(reports.filter(r => r.matchKey === m.matchKey && r.alliance === 'red').map(r => r.teamKey))).slice(0, 3);
                const blueTeams = Array.from(new Set(reports.filter(r => r.matchKey === m.matchKey && r.alliance === 'blue').map(r => r.teamKey))).slice(0, 3);
                return { matchKey: m.matchKey, red: redTeams as string[], blue: blueTeams as string[] };
            })
            .filter((m: SimulatedMatch) => m.red.length === 3 && m.blue.length === 3)
            .sort((a: SimulatedMatch, b: SimulatedMatch) => {
                const numA = parseInt(a.matchKey.split('_qm')[1]) || 0;
                const numB = parseInt(b.matchKey.split('_qm')[1]) || 0;
                return numA - numB;
            });
    }

    const aiSummary = 'Event strategy disabled by user request.';

    return (
        <EventDashboard
            eventKey={eventKey}
            reports={reports}
            schedule={schedule}
            distributions={distributions}
            teamNameMap={teamNameMap}
            aiSummary={aiSummary}
            tbaMatchesRaw={tbaMatchesRaw}
            actualRankings={actualRankings}
            statboticsData={statboticsData}
        />
    );
}
