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
        console.log(`[AI CACHE HIT] ${key}`);
        return cached.content;
    }
    
    console.log(`[AI GENERATING] Fetching new data for: ${key}...`);
    try {
        const result = await fn();
        console.log(`\n==================================================`);
        console.log(`[AI RESPONSE SUCCESS] ${key}`);
        console.log(`==================================================`);
        console.log(result);
        console.log(`==================================================\n`);
        
        if (result && !result.includes("severed") && !result.includes("offline")) {
            AI_CACHE.set(key, { content: result, expiry: now + CACHE_TTL });
        }
        return result;
    } catch (e) {
        console.error(`[AI EXCEPTION] Error generating for ${key}:`, e);
        throw e;
    }
}

const REBUILT_CONTEXT = `
The REBUILT 2026 game involves complex scoring systems and strategic "shifts" that dictate match flow. Based on the TU20 official game manual, here is the current ruleset:

1. Autonomous Period (First 15 Seconds)
- Active Hubs: Both HUBS are active during AUTO.
- Tower Advantage: The ALLIANCE that scores the most FUEL during AUTO earns a strategic advantage; the opponent's HUB becomes inactive for the duration of Teleop Shift 1.
- Auto Tower: Robots can earn 15 points for reaching LEVEL 1 (off the carpet) during AUTO. Max 2 robots per alliance.

2. Teleop Period (2 Minutes 15 Seconds)
- The Shift System: HUBs alternate between active and inactive states in 25-second shifts. Scoring in an inactive HUB earns 0 points.
- Throughput Scoring: A FUEL piece is scored once it passes through the top opening. Scoring continues for 3 seconds after a HUB deactivates/match ends to account for processing time.
- Field Navigation:
  - BUMP: 6.5-inch barrier.
  - TRENCH: 22.25-inch clearance tunnel (50.34" wide).
  - HUB: 47"x47" base, 72" tall to front edge of hexagonal opening (41.7" wide).
  - AprilTags: Used for localization on HUB, TRENCHES, TOWER, and OUTPOST.

3. Endgame (Final 30 Seconds)
- Hub Status: Both HUBs return to active status for the final 30 seconds.
- Tower Levels:
  - LEVEL 1 (10 Points): Robot is no longer touching the carpet or TOWER BASE.
  - LEVEL 2 (20 Points): BUMPER covers must be completely above the LOW RUNG (27.0" high).
  - LEVEL 3 (30 Points): BUMPER covers must be completely above the MID RUNG (45.0" high).
- Rung Details: Low Rung (27"), Mid Rung (45"), High Rung (63"). Center-to-center spacing is 18".
- Contact Rule: Robot must be contacting at least one RUNG or UPRIGHT on their TOWER to earn points.
- Protection: Initiating contact with an opponent inside their TOWER projection is a MAJOR FOUL.

4. Violations and Ranking Points (RP)
- Minor Foul: 5 points to opponent. Major Foul: 15 points to opponent.
- G415: Damaging an opponent inside their perimeter while your bumpers are outside your zone is a MAJOR FOUL.
- Energized RP (1 RP): 100+ FUEL scored in active HUB (240+ for DCMP).
- Supercharged RP (1 RP): Higher secondary FUEL threshold (360+).
- Traversal RP (1 RP): Alliance scores 50+ total TOWER points.
- Win: 3 RP. Tie: 1 RP.
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

export async function generateTeamQuestions(teamKey: string, teamData: any) {
    try {
        const metrics = teamData.metrics || {};
        const autoFuel = metrics.avgAutoFuel || 'N/A';
        const teleFuel = metrics.avgFuel || 'N/A';
        const towerPts = metrics.avgTowerPts || 'N/A';
        const pit = teamData.pitReport || {};
        const synergy = teamData.synergyProfile || {};
        const defense = teamData.defenseProfile || {};
        const matchNotes = (teamData.matchNotes || []).map((n: string) => n.trim()).filter(Boolean);
        const ourData = teamData.ourTeamData;

        let synergyContext = "";
        if (ourData) {
            synergyContext = `
            OUR TEAM (FRC 6377) Profile:
            - Role: ${ourData.synergyProfile?.role || 'Unknown'}
            - Avg Fuel: ${ourData.metrics?.avgFuel || 'N/A'}
            - Avg Tower Pts: ${ourData.metrics?.avgTowerPts || 'N/A'}
            - Pit Specs: Drivebase=Swerve, Climb=None, Trench=True, Bump=True, Hopper=60
            - Pit Notes: ${ourData.pitReport?.otherNotes || 'None'}
            - Defense History: Rating ${ourData.defenseProfile?.defenseRating || 0}/5, Games Defended: ${ourData.defenseProfile?.gamesDefended || 0}
            - Field Observations (Our Match Notes):
              ${(ourData.matchNotes || []).map((n: string, i: number) => `${i + 1}. ${n}`).join('\n              ') || 'None'}
            `;
        }

        const profile = `
        Team ${teamKey} Profile:
        - Auto Fuel: ${autoFuel}
        - Total Avg Fuel: ${teleFuel}
        - Avg Tower Pts: ${towerPts}
        - Pit Intel: Drivebase=${pit.drivebase || '?'}, Max Climb=${pit.climb || '?'}, Hopper Capacity=${pit.hopperCapacity ?? '?'} balls, Turret=${pit.turret || '?'}, Trench=${pit.trench || '?'}, Bump=${pit.bump || '?'}, Shift Tracking=${pit.shiftTracking || '?'}
        - Pit Notes: ${pit.otherNotes || 'None'}
        - Synergy Role: ${synergy.role || 'Unknown'}
        - Strengths: ${((synergy.strengths as string[]) || []).join(', ')}
        - Defense History: Rating ${defense.defenseRating || 0}/5, Games Defended: ${defense.gamesDefended || 0}
        - Field Observations (Match Notes):
          ${matchNotes.map((n: string, i: number) => `${i + 1}. ${n}`).join('\n          ') || 'None'}
        `;

        const prompt = `Role: You are the Lead Strategist for FRC Team 6377 (Howdy Bots). You are an expert in match flow analysis, alliance synergy, and the 2026 game REBUILT. Your goal is to vet potential alliance partners for the Playoff Draft.

Context:

Candidate Team: ${teamKey}

Our Team: ${synergyContext}

Candidate Profile: ${profile}

Game Rules (REBUILT): ${REBUILT_CONTEXT}

Objective:
Generate 3 to 5 "high-signal" interview questions for the candidate’s drive team or pit crew. These questions must determine if this team can survive the rigors of a best-of-three playoff bracket and complement Team 6377's specific playstyle.

Constraints & Style Guidelines:

Generalize Data: Do not use EPA, OPR, or specific cycle counts. Use descriptive language (e.g., "consistent high-volume throughput," "versatile navigation," "resilient under defense").

Focus on Playoff Viability: Prioritize mechanical reliability, software adaptability, and strategic "Pivot-ability" over Ranking Points. Factor in the team's ability to handle playoff-level defense and their synergy with Team 6377.

Evidence-Based: Reference specific observations from the provided profile (including match notes and pit intel) or discrepancies between their "Pit Claims" and "Field Performance" (e.g., if match notes show they struggled with a feature they claim to have).

Smart Filtering: Only ask about abilities the robot is documented to have in its profile. Do not ask about features (like climbing Level 3) if the pit intel or match performance indicates they cannot do it.

Professional & Gracious: Frame questions positively to build rapport while remaining probing. (e.g., "Your climber is impressive; how do you ensure that same success when the HAB is crowded?")

No Visual Obviousness: Do not ask about things that can be timed from a stopwatch (like climb speed). Ask about the process behind the performance.

Mechanical vs. Software: Prioritize questions about software modes or strategic adjustments. Assume significant mechanical overhauls are impossible during the event.

Penalties: DO NOT ASK to generate penalties at all.
Match numbers in notes should be used for context but keep questions general.
Do not mention finals. Instead mention the entirety of the playoff matches.

Task:
Analyze the profile against the rules and output a unformatted list of 3 strategic interview questions. 
        `;

        const cacheKey = `team-questions-${teamKey}-${matchNotes.length}-${(pit.otherNotes || '').length}-synergy-${!!ourData}`;
        return await withCache(cacheKey, async () => {
             const response = await client.chat.send({
                model: 'google/gemini-3-flash-preview',
                messages: [
                    { role: 'system', content: 'You are an FRC Elite Strategy Analyst.' },
                    { role: 'user', content: prompt }
                ],
                stream: false
            });
            return (response.choices[0]?.message?.content as string) || "Generation offline.";
        });
    } catch (e) {
        console.error("AI Questions Error:", e);
        return "Question generation offline.";
    }
}
