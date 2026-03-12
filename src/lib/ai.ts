import { OpenRouter } from "@openrouter/sdk";
import { getStatboticsEvent } from "./statbotics";

const client = new OpenRouter({
    apiKey: process.env.HACK_CLUB_AI_KEY || "",
    serverURL: "https://ai.hackclub.com/proxy/v1",
});

// 5-Minute Memory Cache Utility
const AI_CACHE = new Map<string, { content: string; expiry: number }>();
const CACHE_TTL = 1 * 60 * 60 * 1000; // 1 hour in ms

async function withCache(key: string, fn: () => Promise<string>): Promise<string> {
    const now = Date.now();
    const cached = AI_CACHE.get(key);
    if (cached && now < cached.expiry) {
        console.log(`[AI CACHE] Hit for ${key}`);
        return cached.content;
    }
    const result = await fn();
    if (result && !result.includes("severed") && !result.includes("offline")) {
        AI_CACHE.set(key, { content: result, expiry: now + CACHE_TTL });
    }
    return result;
}

const REBUILT_CONTEXT = `
REBUILT 2026 - Strategic Ruleset:

1. Autonomous Period (First 15 Seconds)
- Leave (3 Points): All robots must leave starting zone.
- FUEL in Hub (1 Point per piece): Score as many FUEL as possible into the Hub.
- Tower Level 1 (15 Points): Robot climbs to Level 1 during auto.
- Both Hubs are active during Auto. Alliance scoring most FUEL wins the "advantage" (opponent Hub inactive for Shift 1).

2. Teleop Period (2 Minutes 15 Seconds)
- FUEL in Hub (1 Point per piece): No limit on robot FUEL capacity - throughput is king.
- Hub Shift System: Hubs alternate active/inactive in 25-second shifts. Check Game Data for which Hub is active.
- Field Obstacles: The Bump (6.5" barrier) and Trench (22" clearance tunnel) require strategic pathing.
- AprilTags on Hub, Trenches, Tower, and Outpost for localization.

3. Endgame (Final 30 Seconds)
- Both Hubs return to active status.
- Tower Level 1 (10 Points): Robot off the carpet.
- Tower Level 2 (20 Points): Bumpers above Low Rung (27 inches).
- Tower Level 3 (30 Points): Bumpers above Mid Rung (45 inches).
- Tower Zone Contact Penalty: Touching opponent near their Tower = opponent gets auto Level 3 (30 pts).

4. Penalties
- Minor Foul: 5 points to opponent.
- Major Foul: 15 points to opponent.

Ranking Points (RP):
- Energized RP: Score >= 100 total FUEL.
- Supercharged RP: Score >= 360 total FUEL.
- Traversal RP: >= 50 total Tower points.
- Win RP: 3 Points for winning, 1 for tie.
`;

export async function generateMatchStrategy(
    matchKey: string,
    alliance: 'red' | 'blue',
    allianceData: any[],
    opponentData: any[]
) {
    try {
        const eventKey = matchKey.split('_')[0];
        const sbData = await getStatboticsEvent(eventKey);

        const formatProfile = (t: any) => {
            const teamNum = parseInt(t.teamKey.replace('frc', ''));
            const epa = sbData.find(s => s.team === teamNum);

            const pitSection = t.pit ? `
                - Pit Intel: Drivebase=${t.pit.drivebase || '?'}, Max Climb=${t.pit.climb || '?'}, Hopper=${t.pit.hopperCapacity ?? '?'} balls, Turret=${t.pit.turret || '?'}, Lob=${t.pit.canLob || '?'}, Trench=${t.pit.trench || '?'}, Bump=${t.pit.bump || '?'}, Shift Tracking=${t.pit.shiftTracking || '?'}, Floor Pickup=${t.pit.pickupFloor || '?'}, Robot Quality=${t.pit.robotQuality ?? '?'}/5${t.pit.otherNotes ? `, Pit Notes: ${t.pit.otherNotes}` : ''}` : '';

            return `
            - Team ${t.teamKey}:
                - FUEL Throughput: Avg Auto Fuel: ${t.avgAutoFuel || 'N/A'}, Avg Teleop Fuel: ${t.avgTeleopFuel || 'N/A'}
                - Tower Performance: Tower Rate: ${t.towerRate || 'N/A'}%, Best Level: ${t.bestTowerLevel || 'N/A'}
                - Auto Performance: ${t.autoMobility}% Mobility, ${t.autoFuel || 'N/A'} Avg Auto Fuel
                - Hub Control: ${t.hubControl || 'N/A'}
                - Trench Capable: ${t.trenchCapable || 'N/A'}
                - Defense Rating: ${t.avgDefense || 'N/A'}/5
                - Breakdown Risk: ${t.failures || 0} failures noticed
                - Intel Notes: ${t.notes || 'None'}
                - STATBOTICS EPA: Total: ${epa?.epa?.breakdown?.total_points?.toFixed(1) || 'N/A'} (Auto: ${epa?.epa?.breakdown?.auto_points?.toFixed(1) || 'N/A'}, Tele: ${epa?.epa?.breakdown?.teleop_points?.toFixed(1) || 'N/A'}, End: ${epa?.epa?.breakdown?.endgame_points?.toFixed(1) || 'N/A'})${pitSection}
        `};

        const allianceProfiles = (allianceData || []).map(formatProfile).join('\n');
        const opponentProfiles = (opponentData || []).map(formatProfile).join('\n');

        const prompt = `
            Analyze Match ${matchKey} for the 2026 FRC Game REBUILT.
            You are the Head Strategist for the ${alliance.toUpperCase()} alliance.
 
            --- OUR ALLIANCE (${alliance.toUpperCase()}) ---
            ${allianceProfiles}
 
            --- OPPOSING ALLIANCE (${alliance === 'red' ? 'BLUE' : 'RED'}) ---
            ${opponentProfiles}
 
            ${REBUILT_CONTEXT}
 
            Task:
            1. **Our Strategic Path**: Precise scoring priorities (RP vs Win). Should we focus on FUEL volume for Energized/Supercharged RP or Tower climbing for Traversal RP?
            2. **Hub Shift Strategy**: Plan for active/inactive Hub shifts. When should we stockpile vs fire?
            3. **Defence Plan**: Should we defend the opponent's Hub access or focus on scoring? Only suggest defense if it's a clear advantage.
            4. **Individual Robots**: What is the specific plan for each robot on our alliance? Factor in Pit Intel (hopper capacity, drivebase, turret, trench capability) alongside match performance. (e.g., "Team X focuses FUEL throughput, Team Y climbs Tower, Team Z controls Hub access.")
            Tone: Professional, High-Stakes Tactical Briefing. Do not use markdown. Please limit your response to 120 words.
        `;

        const cacheKey = `match-${matchKey}-${alliance}`;
        return withCache(cacheKey, async () => {
            const response = await client.chat.send({
                model: 'deepseek/deepseek-v3.2-speciale',
                messages: [
                    { role: 'system', content: 'You are an FRC Elite Strategy Analyst for REBUILT 2026.' },
                    { role: 'user', content: prompt }
                ],
                stream: false,
                maxTokens: 2000,
            });
            return (response.choices[0]?.message?.content as string) || "Strategy generation offline.";
        });
    } catch (e) {
        console.error("AI Strategy Error:", e);
        return "Tactical link severed.";
    }
}

export async function generateAllianceDraft(targetTeam: string, allTeamsData: any[]) {
    try {
        const eventKey = allTeamsData[0]?.matchKey?.split('_')[0] || '2026txcle';
        const sbData = await getStatboticsEvent(eventKey);

        const teamProfiles = allTeamsData.map(t => {
            const teamNum = parseInt(t.teamKey.replace('frc', ''));
            const epa = sbData.find(s => s.team === teamNum);
            const epaStr = (epa && epa.epa?.breakdown?.total_points != null) ? `EPA: ${epa.epa.breakdown.total_points.toFixed(1)}` : '';
            return `
            Team ${t.teamKey}: Avg Fuel: ${t.avgFuel || 'N/A'}, Tower: ${t.avgTowerPts || 'N/A'}, Tower Rate: ${t.towerRate || 'N/A'}% | ${epaStr}
        `}).join('\n');

        const prompt = `
            You are the Alliance Captain for FRC Team ${targetTeam} in REBUILT 2026.
            Drafting for PLAYOFFS (Ignore RPs, focus ONLY on points and winning).

            Available Teams List (Stats):
            ${teamProfiles}

            ${REBUILT_CONTEXT}

            Task:
            1. **Comprehensive Ranking**: Rank EVERY viable team from the list from best to worst options for our alliance.
            2. **Tier Groups**: Group them into 'Tier 1 (Priority Picks)', 'Tier 2 (Strong Complement)', and 'Tier 3 (Backup)'.
            3. **Primary Recommendations**: Specifically identify who should be our 1st Pick and 2nd Pick.
            4. **Strategic Logic**: Explain the strategy based on FUEL throughput, Tower climbing ability, and Hub control.

            Provide a professional draft analysis report. Use a high-impact, tactical tone.
        `;

        const cacheKey = `draft-${targetTeam}-${allTeamsData.length}`;
        return withCache(cacheKey, async () => {
            const response = await client.chat.send({
                model: 'deepseek/deepseek-v3.2-speciale',
                messages: [
                    { role: 'system', content: 'You are an FRC Strategy Specialist for REBUILT 2026.' },
                    { role: 'user', content: prompt }
                ],
                stream: false,
                maxTokens: 2000,
            });
            return (response.choices[0]?.message?.content as string) || "Draft advisor offline.";
        });
    } catch (e) {
        console.error("AI Draft Error:", e);
        return "Intelligence link severed.";
    }
}

export async function generateEventStrategy(eventKey: string, topTeams: any[]) {
    try {
        throw new Error("Not implemented");
        const sbData = await getStatboticsEvent(eventKey);
        const leaderboard = topTeams.map((t, i) => {
            const teamNum = parseInt(t.teamKey.replace('frc', ''));
            const epa = sbData.find(s => s.team === teamNum);
            const epaStr = (epa && epa.epa?.breakdown?.total_points != null) ? `EPA ${epa.epa.breakdown.total_points.toFixed(1)}` : '';
            return `#${i + 1} Team ${t.teamKey}: Avg Fuel ${t.avgFuel || 'N/A'}, Prob Top 1: ${t.prob} | ${epaStr}`;
        }).join('\n');

        const prompt = `
            Analyze the current state of FRC Event ${eventKey} (REBUILT 2026).
            Based on the Top 10 predicted leaderboard:
            ${leaderboard}

            ${REBUILT_CONTEXT}

            Task:
            1. **Event Narrative**: Provide a 2-sentence summary of the competition landscape (e.g., "Team 6377 is dominating FUEL throughput, but Team X is closing in with superior Tower climbing").
            2. **Strategic Pivot**: What should teams in the 5-10 rank range do to disrupt the top tier?
            3. **Key Matchups**: Identify which "profiles" are currently winning (FUEL volume vs Tower height).

            Keep the tone like a professional sports analyst. Use markdown.
        `;

        const cacheKey = `event-${eventKey}-${topTeams[0]?.teamKey}`;
        return withCache(cacheKey, async () => {
            const response = await client.chat.send({
                model: 'deepseek/deepseek-v3.2-speciale',
                messages: [
                    { role: 'system', content: 'You are an FRC Lead Strategic Analyst for REBUILT 2026.' },
                    { role: 'user', content: prompt }
                ],
                stream: false,
                maxTokens: 2000,
            });
            return (response.choices[0]?.message?.content as string) || "Strategic link offline.";
        });
    } catch (e) {
        console.error("Event strategy error:", e);
        return "Intelligence link severed.";
    }
}

export async function generateTeamStrategy(teamKey: string, nickname: string, reports: any[], pitReport?: {
    drivebase?: string; codeLanguage?: string; climb?: string; hopperCapacity?: number | null;
    trench?: string; bump?: string; canLob?: string; canDoze?: string;
    pickupFloor?: string; pickupOutpost?: string; turret?: string; shiftTracking?: string;
    weightLbs?: number | null; heightIn?: number | null; widthIn?: number | null; lengthIn?: number | null;
    climbPosition1?: string; climbPosition2?: string; climbPartners?: number;
    autoClimb?: string; autoPrefStart?: string; kitbot?: string;
    robotQuality?: number; pitQuality?: number; humanPlayer?: string; otherNotes?: string;
} | null) {
    try {
        const TELE_TOWER: Record<string, number> = { Level1: 10, Level2: 20, Level3: 30, 'No Attempt': 0 };
        const stats = {
            avgFuel: (reports.reduce((acc, r) => acc + r.data.auto.fuel_scored + r.data.teleop.fuel_scored, 0) / (reports.length || 1)).toFixed(1),
            autoMove: (reports.filter(r => r.data.auto.moved).length / (reports.length || 1) * 100).toFixed(0),
            towerRate: (reports.filter(r => r.data.teleop.climb_level !== 'No Attempt').length / (reports.length || 1) * 100).toFixed(0),
            avgTowerPts: (reports.reduce((acc, r) => acc + (TELE_TOWER[r.data.teleop.climb_level] || 0), 0) / (reports.length || 1)).toFixed(1),
            failures: reports.filter(r => r.data.mech_failure).length,
            avgDefense: (reports.reduce((acc, r) => acc + (r.data.defender_rating || 0), 0) / (reports.length || 1)).toFixed(1)
        };

        const scouterIntel = reports.map(r => `[Match ${r.matchKey.split('_qm').pop()}]: ${r.data.notes || 'No notes.'}`).join('\n');

        const pitSection = pitReport ? `
Pit Scouting Intel:
- Drivebase: ${pitReport.drivebase || 'Unknown'} | Code: ${pitReport.codeLanguage || 'Unknown'}
- Dimensions: ${pitReport.weightLbs ?? '?'} lbs, ${pitReport.heightIn ?? '?'}" H × ${pitReport.widthIn ?? '?'}" W × ${pitReport.lengthIn ?? '?'}" L
- Hopper Capacity: ${pitReport.hopperCapacity ?? 'Unknown'} balls
- Turret: ${pitReport.turret || '?'} | Shift Tracking: ${pitReport.shiftTracking || '?'}
- Pickup: Floor=${pitReport.pickupFloor || '?'}, Outpost=${pitReport.pickupOutpost || '?'}, Lob=${pitReport.canLob || '?'}, Doze=${pitReport.canDoze || '?'}
- Tower: Max=${pitReport.climb || '?'}, Pos1=${pitReport.climbPosition1 || '?'}, Pos2=${pitReport.climbPosition2 || '?'}, Partners=${pitReport.climbPartners ?? '?'}, AutoClimb=${pitReport.autoClimb || '?'}
- Field Nav: Trench=${pitReport.trench || '?'}, Bump=${pitReport.bump || '?'}
- Auto Start Pref: ${pitReport.autoPrefStart || '?'}
- Robot Quality: ${pitReport.robotQuality ?? '?'}/5 | Pit Quality: ${pitReport.pitQuality ?? '?'}/5
- Kitbot: ${pitReport.kitbot || 'Custom'} | Human Player: ${pitReport.humanPlayer || 'Unknown'}
- Pit Notes: ${pitReport.otherNotes || 'None'}
` : 'Pit Scouting Intel: Not yet collected.';

        const prompt = `
            Analyze Team ${teamKey.replace('frc', '')} (${nickname}) for FRC REBUILT 2026.
            
            Match Performance Profile (${reports.length} matches scouted):
            - Average FUEL per Match: ${stats.avgFuel}
            - Auto Mobility: ${stats.autoMove}%
            - Tower Climb Rate: ${stats.towerRate}%
            - Avg Tower Points: ${stats.avgTowerPts}
            - Mechanical Failures: ${stats.failures} in ${reports.length} matches
            - Defense Capability Rating: ${stats.avgDefense}/5

            ${pitSection}

            Scouter Field Observations:
            ${scouterIntel || 'None yet.'}

            ${REBUILT_CONTEXT}

            Task:
            1. **Scouter Synthesis**: Combine match observations AND pit intel into a cohesive robot profile. Note mechanical issues, hopper capacity implications, and field navigation ability (trench/bump).
            2. **Strategy for Alliance Partners**: How should an alliance best utilize this robot based on both its pit specs AND match performance? (e.g. "Primary FUEL Scorer" vs "Tower Specialist" vs "Hub Controller" vs "Defensive Specialist").
            3. **Opponent Playbook**: How can an opponent shut them down? Consider drivebase, trench/bump capability, and reliability.

            Tone: Professional Tactical Intel. Use Markdown. Please limit your response to 120 words.
        `;

        const pitFingerprint = pitReport
            ? `${pitReport.drivebase}-${pitReport.climb}-${pitReport.hopperCapacity}-${pitReport.robotQuality}`
            : 'nopit';
        const cacheKey = `team-${teamKey}-${reports.length}-${pitFingerprint}`;
        return withCache(cacheKey, async () => {
            const response = await client.chat.send({
                model: 'deepseek/deepseek-v3.2-speciale',
                messages: [
                    { role: 'system', content: 'You are an FRC Lead Tactical Scout for REBUILT 2026.' },
                    { role: 'user', content: prompt }
                ],
                stream: false,
            });
            return (response.choices[0]?.message?.content as string) || "Scouter notes unavailable.";
        });
    } catch (e) {
        console.error("Team strategy error:", e);
        return "Intelligence link severed.";
    }
}
