import { getMissionData, getEventSchedule } from '@/lib/data';
import { TeamPerformanceDistribution, SimulatedMatch } from '@/lib/simulation';
import { getEventTeams, getEventRankings } from '@/lib/tba';
import { getStatboticsEvent } from '@/lib/statbotics';
import EventDashboard from './EventDashboard';

export default async function EventView({ params }: { params: Promise<{ eventKey: string }> }) {
    const { eventKey } = await params;
    const { reports, tbaMatches, tbaMatchesRaw } = await getMissionData(eventKey);
    const eventTeams = await getEventTeams(eventKey);
    const actualRankings = await getEventRankings(eventKey);

    // Map team keys to nicknames
    const teamNameMap: Record<string, string> = {};
    eventTeams.forEach((t: any) => {
        teamNameMap[t.key] = t.nickname || t.team_number.toString();
    });

    // 1. Gather all team keys — from reports AND from the registered event roster
    const reportTeamKeys = new Set(reports.map(r => r.teamKey));
    const allTeamKeys = Array.from(
        new Set([
            ...Array.from(reportTeamKeys),
            ...eventTeams.map((t: any) => t.key as string),
        ])
    );

    // Also seed teamNameMap from event teams
    eventTeams.forEach((t: any) => {
        teamNameMap[t.key] = t.nickname || String(t.team_number);
    });

    const distributions: TeamPerformanceDistribution[] = allTeamKeys.map(t => ({
        teamKey: t,
        pastSyntheticMatches: reports.filter(r => r.teamKey === t).map(r => r.data),
    }));

    // 2. Build schedule from TBA raw matches first (has team_keys when schedule is released)
    //    Fall back to DB schedule, then to report-derived schedule
    let schedule: SimulatedMatch[] = [];

    const tbaQmMatches = tbaMatchesRaw.filter((m: any) => m.comp_level === 'qm');

    if (tbaQmMatches.length > 0) {
        // TBA has the schedule — use it directly
        schedule = tbaQmMatches
            .map((m: any) => ({
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
        // Fall back to DB EventMatches table
        const dbSchedule = await getEventSchedule(eventKey);
        schedule = dbSchedule.map((m: { key: string; red: string[]; blue: string[] }) => ({
            matchKey: m.key,
            red: m.red,
            blue: m.blue,
        })).filter((m: SimulatedMatch) => m.red.length === 3 && m.blue.length === 3);
    }

    if (schedule.length === 0) {
        // Last resort: derive from scouting reports (pre-schedule fallback)
        schedule = Object.values(tbaMatches).map((m: any) => {
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

    const aiSummary = "Event strategy disabled by user request.";

    // 3. Fetch Statbotics Data
    const statboticsData = await getStatboticsEvent(eventKey);

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
