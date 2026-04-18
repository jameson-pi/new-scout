import { getMissionData, getEventTeamList, getAllPitReports } from '@/lib/data';
import { getEventTeams } from '@/lib/tba';
import { getStatboticsEvent } from '@/lib/statbotics';
import { calculateSPR, calculateTeamEPA } from '@/lib/spr';
import { calculateAllTeamReliability } from '@/lib/reliability';
import { generatePickList } from '@/lib/pickList';
import TeamsClient from './TeamsClient';

export default async function TeamsListPage({ params }: { params: Promise<{ eventKey: string }> }) {
    const { eventKey } = await params;

    const [{ reports, tbaMatches }, tbaTeams, statboticsData, pitReports] = await Promise.all([
        getMissionData(eventKey),
        getEventTeams(eventKey),
        getStatboticsEvent(eventKey),
        getAllPitReports(eventKey),
    ]);

    // Full roster — works even before matches are played
    const rosterList = await getEventTeamList(eventKey, tbaTeams);

    // Build name map from TBA + DB roster
    const teamNameMap: Record<string, string> = {};
    tbaTeams.forEach((t: { key: string; nickname?: string; team_number?: number }) => {
        teamNameMap[t.key] = t.nickname || String(t.team_number);
    });
    rosterList.forEach(r => {
        if (!teamNameMap[r.teamKey]) teamNameMap[r.teamKey] = r.name;
    });

    const reliabilityData = calculateAllTeamReliability(reports);
    const pickListData = generatePickList(reports, reliabilityData);
    // Compute scouter accuracy stats so EPA can be weighted by scouter precision
    const scouterStats = calculateSPR(reports, tbaMatches);

    // Union: all roster teams + any scouted-but-not-on-roster teams
    const allScoutedKeys = Array.from(new Set(reports.map(r => r.teamKey)));
    const rosterKeys = new Set(rosterList.map(r => r.teamKey));
    const allTeamKeys = [
        ...rosterList.map(r => r.teamKey),
        ...allScoutedKeys.filter(k => !rosterKeys.has(k)),
    ];

    const teams = Array.from(new Set(allTeamKeys)).map(teamKey => {
        const teamNum = parseInt(teamKey.replace('frc', ''), 10);
        const teamReports = reports.filter(r => r.teamKey === teamKey);
        const ourEPA = calculateTeamEPA(teamReports, scouterStats);

        const sbData = (statboticsData as { team: number; epa?: { breakdown?: { total_points?: number } } }[])
            .find(s => s.team === teamNum);
        const sbEPA = sbData?.epa?.breakdown?.total_points ?? null;

        const reliability = reliabilityData.find(r => r.teamKey === teamKey);
        const synergy = pickListData.find(p => p.teamKey === teamKey);
        const pit = pitReports.find(p => p.teamKey === teamKey);

        // Collect all notes: pit notes + match scouter notes
        const matchNotes = teamReports.map(r => r.data.notes).filter((n): n is string => !!n);
        const allNotes = [
            ...(pit?.otherNotes ? [pit.otherNotes] : []),
            ...matchNotes,
        ];

        return {
            teamKey,
            teamNum,
            name: teamNameMap[teamKey] || `Team ${teamNum}`,
            ourEPA,
            sbEPA,
            matchesScouted: teamReports.length,
            failureRate: reliability?.failureRate ?? 0,
            consistencyScore: reliability?.consistencyScore ?? 50,
            riskLevel: (reliability?.riskLevel ?? 'medium') as 'low' | 'medium' | 'high',
            synergyScore: synergy?.synergyScore ?? 0,
            role: synergy?.role ?? 'balanced',
            strengths: synergy?.strengths ?? [],
            allNotes,
            hasPit: !!pit,
        };
    }).sort((a, b) => {
        // Scouted teams first by EPA, then unscouted by team number
        if (a.matchesScouted > 0 && b.matchesScouted === 0) return -1;
        if (a.matchesScouted === 0 && b.matchesScouted > 0) return 1;
        if (a.matchesScouted > 0) return b.ourEPA - a.ourEPA;
        return a.teamNum - b.teamNum;
    });

    return <TeamsClient eventKey={eventKey} teams={teams} />;
}
