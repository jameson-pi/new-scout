import { getMissionData, getAllPitReports } from '@/lib/data';
import { getEventTeams } from '@/lib/tba';
import { getStatboticsEvent } from '@/lib/statbotics';
import { calculateTeamEPA } from '@/lib/spr';
import { calculateAllTeamReliability } from '@/lib/reliability';
import { generatePickList } from '@/lib/pickList';
import CompareClient from './CompareClient';

const TELE_TOWER: Record<string, number> = { Level1: 10, Level2: 20, Level3: 30, 'No Attempt': 0 };

export default async function ComparePage({ params }: { params: Promise<{ eventKey: string }> }) {
    const { eventKey } = await params;
    const [{ reports }, eventTeams, statboticsData, pitReports] = await Promise.all([
        getMissionData(eventKey),
        getEventTeams(eventKey),
        getStatboticsEvent(eventKey),
        getAllPitReports(eventKey),
    ]);

    // Map team keys to nicknames
    const teamNameMap: Record<string, string> = {};
    eventTeams.forEach((t: any) => {
        teamNameMap[t.key] = t.nickname || t.team_number.toString();
    });

    const reliabilityData = calculateAllTeamReliability(reports);
    const pickListData = generatePickList(reports, reliabilityData);

    const teams = Array.from(new Set(reports.map(r => r.teamKey))).map(teamKey => {
        const teamNum = parseInt(teamKey.replace('frc', ''));
        const teamReports = reports.filter(r => r.teamKey === teamKey);
        const ourEPA = calculateTeamEPA(teamReports);

        const sbData = statboticsData.find(s => s.team === teamNum);
        const reliability = reliabilityData.find(r => r.teamKey === teamKey);
        const synergy = pickListData.find(p => p.teamKey === teamKey);
        const pit = pitReports.find(p => p.teamKey === teamKey);

        const avgFuel = teamReports.reduce((acc, r) => acc + r.data.auto.fuel_scored + r.data.teleop.fuel_scored, 0) / teamReports.length;
        const avgTowerPts = teamReports.reduce((acc, r) => acc + (TELE_TOWER[r.data.teleop.climb_level] || 0), 0) / teamReports.length;
        const towerRate = teamReports.filter(r => r.data.teleop.climb_level !== 'No Attempt').length / teamReports.length * 100;
        const avgDefense = teamReports.reduce((acc, r) => acc + (r.data.defender_rating || 0), 0) / teamReports.length;

        // Collect all notes: match scouter notes + pit notes
        const matchNotes = teamReports.map(r => r.data.notes).filter(Boolean);
        const allNotes = [
            ...(pit?.otherNotes ? [`[PIT] ${pit.otherNotes}`] : []),
            ...matchNotes,
        ];

        return {
            teamKey,
            teamNum,
            name: teamNameMap[teamKey] || 'TEAM',
            ourEPA,
            sbEPA: sbData?.epa?.breakdown?.total_points || null,
            avgFuel,
            avgTowerPts,
            towerRate,
            avgDefense,
            consistencyScore: reliability?.consistencyScore || 50,
            synergyScore: synergy?.synergyScore || 0,
            allNotes,
        };
    });

    return <CompareClient eventKey={eventKey} teams={teams} />;
}
