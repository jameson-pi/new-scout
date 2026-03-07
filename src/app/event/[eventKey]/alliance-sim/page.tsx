import Link from 'next/link';
import { getMissionData } from '@/lib/data';
import { getEventTeams } from '@/lib/tba';
import { getStatboticsEvent } from '@/lib/statbotics';
import { calculateAllTeamReliability } from '@/lib/reliability';
import { generatePickList, analyzeTeamRole, calculateAllianceSynergy, TeamSynergyProfile } from '@/lib/pickList';
import AllianceSimClient from './AllianceSimClient';

export default async function AllianceSimPage({ params }: { params: Promise<{ eventKey: string }> }) {
    const { eventKey } = await params;
    const { reports } = await getMissionData(eventKey);
    const eventTeams = await getEventTeams(eventKey);
    const statboticsData = await getStatboticsEvent(eventKey);

    // Map team keys to nicknames
    const teamNameMap: Record<string, string> = {};
    eventTeams.forEach((t: any) => {
        teamNameMap[t.key] = t.nickname || t.team_number.toString();
    });

    // Calculate reliability and synergy for all teams
    const reliabilityData = calculateAllTeamReliability(reports);
    const pickListData = generatePickList(reports, reliabilityData);

    // Prepare team data for client
    const teamsData = pickListData.map(p => ({
        ...p,
        name: teamNameMap[p.teamKey] || p.teamKey.replace('frc', '')
    }));

    return <AllianceSimClient eventKey={eventKey} teams={teamsData} />;
}
