import { getTacticalStrategy, getTeamStrategyAction, getTeamQuestionsAction } from './actions';
import { getMissionData, getPitReport } from './data';
import { getEventTeams, getEventMatches } from './tba';
import { getStatboticsEvent } from './statbotics';
import {calculateTeamEPA, ScoutReport} from './spr';
import { calculateTeamReliability } from './reliability';
import { analyzeTeamRole } from './pickList';
import { analyzeDefenseProfile } from './defense';

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.log(`
Usage: npm run ask-ai -- <command> <args>

Available Commands:
  team-questions <eventKey> <teamKey>   (e.g., npm run ask-ai -- team-questions 2026txcle frc6377)
  team-strategy <eventKey> <teamKey>    (e.g., npm run ask-ai -- team-strategy 2026txcle frc6377)
  match-strategy <eventKey> <matchKey> <alliance> (e.g., npm run ask-ai -- match-strategy 2026txcle 2026txcle_qm1 red)
        `);
        process.exit(1);
    }

    const command = args[0];
    const eventKey = args[1];

    if (command === 'team-questions' || command === 'team-strategy') {
        const teamKey = args[2];
        if (!teamKey) throw new Error("Missing teamKey argument");

        console.log(`Loading data for ${teamKey} at ${eventKey}...`);
        const { reports } = await getMissionData(eventKey);
        const teamReports = reports.filter(r => r.teamKey === teamKey);
        const pitReport = await getPitReport(teamKey, eventKey);
        
        let teamName = "Unknown";
        try {
            const teams = await getEventTeams(eventKey);
            const teamInfo = teams.find((t: { key: string; }) => t.key === teamKey);
            if (teamInfo) teamName = teamInfo.nickname || teamInfo.name || "Unknown";
        } catch(e) {}

        if (command === 'team-strategy') {
            console.log(`Generating strategy for ${teamName}...`);
            await getTeamStrategyAction(teamKey, teamName, teamReports as any, pitReport as any);
        } else {
            console.log(`Generating questions for ${teamName}...`);
            const TELE_TOWER: Record<string, number> = { Level1: 10, Level2: 20, Level3: 30, 'No Attempt': 0 };
            const metrics = {
                avgFuel: (teamReports.reduce((acc, r) => acc + (r.data.auto?.fuel_scored || 0) + (r.data.teleop?.fuel_scored || 0), 0) / (teamReports.length || 1)).toFixed(1),
                avgTowerPts: (teamReports.reduce((acc, r) => acc + (TELE_TOWER[r.data.teleop?.climb_level] || 0), 0) / (teamReports.length || 1)).toFixed(1),
                towerRate: ((teamReports.filter(r => r.data.teleop?.climb_level !== 'No Attempt').length / (teamReports.length || 1)) * 100).toFixed(0),
                autoMove: ((teamReports.filter(r => r.data.auto?.moved).length / (teamReports.length || 1)) * 100).toFixed(0),
                avgAutoFuel: (teamReports.reduce((acc, r) => acc + (r.data.auto?.fuel_scored || 0), 0) / (teamReports.length || 1)).toFixed(1),
            };
            const reliability = calculateTeamReliability(teamReports);
            const synergyProfile = analyzeTeamRole(teamReports);
            const defenseProfile = analyzeDefenseProfile(teamReports);
            const matchNotes = teamReports.map((r: ScoutReport) => r.data?.notes).filter(Boolean);

            const teamData = { metrics, pitReport, synergyProfile, defenseProfile, matchNotes };

            await getTeamQuestionsAction(teamKey, teamData);
        }
    } else if (command === 'match-strategy') {
        const matchKey = args[2];
        const alliance = args[3] as 'red' | 'blue';
        if (!matchKey || !alliance) throw new Error("Missing matchKey or alliance argument");

        console.log(`Loading match data for ${matchKey}...`);
        const matches = await getEventMatches(eventKey);
        const matchInfo = matches.find(m => m.key === matchKey);
        if (!matchInfo) throw new Error("Match not found");
        
        // Use tactical strategy
        console.log(`Generating tactical strategy for ${matchKey} ${alliance} alliance...`);
        // Provide mock structure for demonstration or actual extraction if desired
        // The getTacticalStrategy relies on formatting teams. For a generic check, we can pass mock data or just pass the teams.
        const mockAllianceData = matchInfo.alliances[alliance].team_keys.map(tk => ({ teamKey: tk }));
        const opponent = alliance === 'red' ? 'blue' : 'red';
        const mockOpponentData = matchInfo.alliances[opponent].team_keys.map(tk => ({ teamKey: tk }));
        
        await getTacticalStrategy(matchKey, alliance, mockAllianceData, mockOpponentData);
    } else {
        console.log("Unknown command. Try: team-questions, team-strategy, or match-strategy");
    }
}

main().catch(console.error);
