import Link from 'next/link';
import { getMissionData } from '@/lib/data';
import { getEventTeams } from '@/lib/tba';
import { getStatboticsEvent } from '@/lib/statbotics';
import { calculateTeamEPA } from '@/lib/spr';
import { calculateAllTeamReliability } from '@/lib/reliability';
import { generatePickList } from '@/lib/pickList';
import TeamsClient from './TeamsClient';

export default async function TeamsListPage({ params }: { params: Promise<{ eventKey: string }> }) {
    const { eventKey } = await params;
    const { reports } = await getMissionData(eventKey);
    const eventTeams = await getEventTeams(eventKey);
    const statboticsData = await getStatboticsEvent(eventKey);

    // Map team keys to nicknames
    const teamNameMap: Record<string, string> = {};
    eventTeams.forEach((t: any) => {
        teamNameMap[t.key] = t.nickname || t.team_number.toString();
    });

    // Calculate reliability for all teams
    const reliabilityData = calculateAllTeamReliability(reports);

    // Generate pick list with synergy scores
    const pickListData = generatePickList(reports, reliabilityData);

    const teams = Array.from(new Set(reports.map(r => r.teamKey))).map(teamKey => {
        const teamNum = parseInt(teamKey.replace('frc', ''));
        const teamReports = reports.filter(r => r.teamKey === teamKey);
        const ourEPA = calculateTeamEPA(teamReports);

        const sbData = statboticsData.find(s => s.team === teamNum);
        const sbEPA = sbData?.epa?.breakdown?.total_points;

        const reliability = reliabilityData.find(r => r.teamKey === teamKey);
        const synergy = pickListData.find(p => p.teamKey === teamKey);

        return {
            teamKey,
            teamNum,
            name: teamNameMap[teamKey] || 'UNIT',
            ourEPA,
            sbEPA: sbEPA ?? null,
            failureRate: reliability?.failureRate || 0,
            consistencyScore: reliability?.consistencyScore || 50,
            riskLevel: reliability?.riskLevel || 'medium',
            synergyScore: synergy?.synergyScore || 0,
            role: synergy?.role || 'balanced',
            strengths: synergy?.strengths || []
        };
    }).sort((a, b) => b.ourEPA - a.ourEPA);

    return <TeamsClient eventKey={eventKey} teams={teams} />;
}
