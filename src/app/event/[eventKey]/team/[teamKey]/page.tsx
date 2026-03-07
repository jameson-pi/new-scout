import Link from 'next/link';
import { getMissionData } from '@/lib/data';
import { getEventTeams } from '@/lib/tba';
import { getStatboticsEvent } from '@/lib/statbotics';
import { generateTeamStrategy } from '@/lib/ai';
import { calculateTeamEPA } from '@/lib/spr';
import { calculateTeamReliability } from '@/lib/reliability';
import { calculateConsensus } from '@/lib/consensus';
import { analyzeTeamRole } from '@/lib/pickList';
import { analyzeDefenseProfile } from '@/lib/defense';
import ReactMarkdown from 'react-markdown';
import TeamDetailClient from './TeamDetailClient';

const TELE_TOWER: Record<string, number> = { Level1: 10, Level2: 20, Level3: 30, None: 0 };

export default async function TeamView({ params }: { params: Promise<{ teamKey: string, eventKey: string }> }) {
    const { teamKey, eventKey } = await params;
    const teamNum = teamKey?.replace('frc', '') || '6377';

    const { reports } = await getMissionData(eventKey);
    const eventTeams = await getEventTeams(eventKey);
    const statboticsData = await getStatboticsEvent(eventKey);
    const teamInfo = eventTeams.find((t: any) => t.key === teamKey);
    const teamName = teamInfo?.nickname || teamInfo?.name || 'Tactical Unit';

    const teamReports = reports.filter(r => r.teamKey === teamKey).sort((a, b) => {
        const getNum = (key: string) => parseInt(key.split('_qm').pop() || '0') || 0;
        return getNum(a.matchKey) - getNum(b.matchKey);
    });

    // Core Metrics (REBUILT 2026)
    const metrics = {
        avgFuel: (teamReports.reduce((acc, r) => acc + (r.data.auto.fuel_scored || 0) + (r.data.teleop.fuel_scored || 0), 0) / (teamReports.length || 1)).toFixed(1),
        avgTowerPts: (teamReports.reduce((acc, r) => acc + (TELE_TOWER[r.data.teleop.tower_level] || 0), 0) / (teamReports.length || 1)).toFixed(1),
        towerRate: ((teamReports.filter(r => r.data.teleop.tower_level !== 'None').length / (teamReports.length || 1)) * 100).toFixed(0),
        autoMove: ((teamReports.filter(r => r.data.auto.moved).length / (teamReports.length || 1)) * 100).toFixed(0),
        avgAutoFuel: (teamReports.reduce((acc, r) => acc + (r.data.auto.fuel_scored || 0), 0) / (teamReports.length || 1)).toFixed(1)
    };

    // Feature Data
    const ourEPA = calculateTeamEPA(teamReports);
    const sbData = statboticsData.find(s => s.team === parseInt(teamNum));
    const sbEPA = sbData?.epa?.breakdown?.total_points || null;

    const reliability = calculateTeamReliability(teamReports);
    const consensus = calculateConsensus(teamReports);
    const synergyProfile = analyzeTeamRole(teamReports);
    const defenseProfile = analyzeDefenseProfile(teamReports);

    const aiNotes = (await generateTeamStrategy(teamKey, teamName, teamReports)).replace(/\r\n/g, '\n');

    const matchHistory = teamReports.map(r => {
        const d = r.data;
        const teleScore = (d.teleop.fuel_scored || 0) * 1 + (TELE_TOWER[d.teleop.tower_level] || 0);
        const autoScore = (d.auto.fuel_scored || 0) * 1 + (d.auto.moved ? 3 : 0);
        return {
            match: r.matchKey.split('_qm').pop() || '0',
            total: teleScore + autoScore,
            teleOP: teleScore,
            auto: autoScore
        };
    }).sort((a, b) => (parseInt(a.match) || 0) - (parseInt(b.match) || 0));

    return (
        <TeamDetailClient
            eventKey={eventKey}
            teamKey={teamKey}
            teamNum={teamNum}
            teamName={teamName}
            teamReports={teamReports}
            metrics={metrics}
            ourEPA={ourEPA}
            sbEPA={sbEPA}
            reliability={reliability}
            consensus={consensus}
            synergyProfile={synergyProfile}
            defenseProfile={defenseProfile}
            aiNotes={aiNotes}
            matchHistory={matchHistory}
        />
    );
}
