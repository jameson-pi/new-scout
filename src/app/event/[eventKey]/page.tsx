import { getMissionData } from '@/lib/data';
import { TeamPerformanceDistribution, SimulatedMatch } from '@/lib/simulation';
import { getEventTeams, getEventRankings } from '@/lib/tba';
import { generateEventStrategy } from '@/lib/ai';
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

    // 1. Convert historical reports to TeamPerformanceDistribution
    const teams = Array.from(new Set(reports.map(r => r.teamKey)));
    const distributions: TeamPerformanceDistribution[] = teams.map(t => ({
        teamKey: t as string,
        pastSyntheticMatches: reports.filter(r => r.teamKey === t).map(r => r.data)
    }));

    // 2. Format matches for simulation
    const schedule: SimulatedMatch[] = Object.values(tbaMatches).map((m: any) => {
        const redTeams = Array.from(new Set(reports.filter(r => r.matchKey === m.matchKey && r.alliance === 'red').map(r => r.teamKey))).slice(0, 3);
        const blueTeams = Array.from(new Set(reports.filter(r => r.matchKey === m.matchKey && r.alliance === 'blue').map(r => r.teamKey))).slice(0, 3);

        return {
            matchKey: m.matchKey,
            red: redTeams,
            blue: blueTeams
        };
    })
        .filter(m => m.red.length === 3 && m.blue.length === 3)
        .sort((a, b) => {
            const numA = parseInt(a.matchKey.split('_qm')[1]) || 0;
            const numB = parseInt(b.matchKey.split('_qm')[1]) || 0;
            return numA - numB;
        });

    // 3. Get AI Summary for the top teams (Initial State)
    const topTeamsForAI = teams.slice(0, 10).map(tk => ({
        teamKey: tk,
        avgL4: (reports.filter(r => r.teamKey === tk).reduce((acc, r) => acc + r.data.teleop.coral_l4, 0) / (reports.filter(r => r.teamKey === tk).length || 1)).toFixed(1),
        prob: "CALCULATING..."
    }));
    const aiSummary = await generateEventStrategy(eventKey, topTeamsForAI);

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
        />
    );
}
