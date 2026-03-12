import { getMissionData, getAllPitReports } from '@/lib/data';
import { getEventTeams } from '@/lib/tba';
import { getStatboticsEvent } from '@/lib/statbotics';
import { calculateTeamEPA } from '@/lib/spr';
import { calculateAllTeamReliability } from '@/lib/reliability';
import PitCompareClient from './PitCompareClient';

export default async function PitComparePage({ params }: { params: Promise<{ eventKey: string }> }) {
    const { eventKey } = await params;

    const [{ reports }, eventTeams, statboticsData, pitReports] = await Promise.all([
        getMissionData(eventKey),
        getEventTeams(eventKey),
        getStatboticsEvent(eventKey),
        getAllPitReports(eventKey),
    ]);

    const teamNameMap: Record<string, string> = {};
    eventTeams.forEach((t: { key: string; nickname?: string; team_number?: number }) => {
        teamNameMap[t.key] = t.nickname || String(t.team_number ?? t.key.replace('frc', ''));
    });

    const reliabilityData = calculateAllTeamReliability(reports);

    // Build team list — all teams with either pit data OR match scouting data
    const allTeamKeys = Array.from(new Set([
        ...pitReports.map(p => p.teamKey),
        ...reports.map(r => r.teamKey),
    ]));

    const teams = allTeamKeys.map(teamKey => {
        const teamNum = parseInt(teamKey.replace('frc', ''));
        const teamReports = reports.filter(r => r.teamKey === teamKey);
        const pit = pitReports.find(p => p.teamKey === teamKey) ?? null;
        const sbData = statboticsData.find(s => s.team === teamNum);
        const reliability = reliabilityData.find(r => r.teamKey === teamKey);

        const ourEPA = teamReports.length > 0 ? calculateTeamEPA(teamReports) : 0;
        const avgFuel = teamReports.length > 0
            ? teamReports.reduce((acc, r) => acc + r.data.auto.fuel_scored + r.data.teleop.fuel_scored, 0) / teamReports.length
            : 0;

        const TOWER_PTS: Record<string, number> = { Level1: 10, Level2: 20, Level3: 30, 'No Attempt': 0 };
        const avgTowerPts = teamReports.length > 0
            ? teamReports.reduce((acc, r) => acc + (TOWER_PTS[r.data.teleop.climb_level] || 0), 0) / teamReports.length
            : 0;
        const towerRate = teamReports.length > 0
            ? (teamReports.filter(r => r.data.teleop.climb_level !== 'No Attempt').length / teamReports.length) * 100
            : 0;
        const climbMax = teamReports.length > 0
            ? Math.max(...teamReports.map(r => TOWER_PTS[r.data.teleop.climb_level] || 0))
            : 0;
        const avgDefense = teamReports.length > 0
            ? teamReports.reduce((acc, r) => acc + (r.data.defender_rating || 0), 0) / teamReports.length
            : 0;
        const failureRate = teamReports.length > 0
            ? (teamReports.filter(r => r.data.mech_failure).length / teamReports.length) * 100
            : 0;

        return {
            teamKey,
            teamNum,
            name: teamNameMap[teamKey] || 'TEAM',
            pit,
            ourEPA,
            sbEPA: sbData?.epa?.breakdown?.total_points ?? null,
            avgFuel,
            avgTowerPts,
            towerRate,
            climbMax,
            avgDefense,
            failureRate,
            consistencyScore: reliability?.consistencyScore ?? 0,
            matchCount: teamReports.length,
        };
    });

    return <PitCompareClient eventKey={eventKey} teams={teams} />;
}

