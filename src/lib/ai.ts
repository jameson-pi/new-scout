import { OpenRouter } from "@openrouter/sdk";

const client = new OpenRouter({
    apiKey: process.env.HACK_CLUB_AI_KEY || "",
    serverURL: "https://ai.hackclub.com/proxy/v1",
});

const REEFSCAPE_CONTEXT = `
REEFSCAPE 2025 - Strategic Ruleset:

1. Autonomous Period (First 15 Seconds)
- Leave (3 Points): All robots must leave starting zone.
- Coral L1 (3 Points), L2 (4 Points), L3 (6 Points), L4 (7 Points).
- Algae Processor (6 Points), Net (4 Points).

2. Teleop Period (2 Minutes 15 Seconds)
- Coral Scoring: L1 (2 Points), L2 (3 Points), L3 (4 Points), L4 (5 Points).
- Algae Scoring: Processor (6 Points), Net (4 Points). Algae blocks L2/L3 branches and must be removed to score Coral there.
- Coopertition: 2 Algae in Processor by both alliances lowers Coral RP threshold.

3. Endgame
- Park (2 Points).
- Shallow Cage Hang (6 Points).
- Deep Cage Hang (12 Points). Required for Barge RP (14+ pts).

Ranking Points (RP):
- Auto RP: 3 Move + 1 Auto Coral.
- Coral RP: Score 5 Coral on L1, L2, L3, AND L4 (Thresholds reduced by Coopertition).
- Barge RP: 14+ Endgame points.
- Win RP: 3 Points for winning.
`;

export async function generateMatchStrategy(
    matchKey: string,
    alliance: 'red' | 'blue',
    allianceData: any[],
    opponentData: any[]
) {
    try {
        const formatProfile = (t: any) => `
            - Team ${t.teamKey}:
                - Avg L4 Coral: ${t.avgL4}
                - Auto Mobility: ${t.autoMobility}%
                - Max Algae Harvest: ${t.maxAlgae}
                - Deep Climb Rate: ${t.climbRate}%
                - Defense Rating: ${t.avgDefense || 'N/A'}/5
                - Breakdown Risk: ${t.failures || 0} failures noticed
                - Intel Notes: ${t.notes || 'None'}
        `;

        const allianceProfiles = (allianceData || []).map(formatProfile).join('\n');
        const opponentProfiles = (opponentData || []).map(formatProfile).join('\n');

        const prompt = `
            Analyze Match ${matchKey} for the 2025 FRC Game Reefscape.
            You are the Head Strategist for the ${alliance.toUpperCase()} alliance.
 
            --- OUR ALLIANCE (${alliance.toUpperCase()}) ---
            ${allianceProfiles}
 
            --- OPPOSING ALLIANCE (${alliance === 'red' ? 'BLUE' : 'RED'}) ---
            ${opponentProfiles}
 
            ${REEFSCAPE_CONTEXT}
 
            Task:
            1. **Match Forecast**: Who has the mechanical advantage? Is this a high-scoring shootout or a defensive grind?
            2. **Target Neutralization**: Identify the MOST DANGEROUS robot on the opposing alliance. What is the specific plan to shut them down? (e.g., "Pin Team X at the Processor to prevent Algae clearing").
            3. **Our Strategic Path**: Precise scoring priorities (RP vs Win). Should we focus on L4 branch dominance or Algae-clearing for L2/L3 access?
            4. **Endgame Coordination**: Coordination plan for the Deep Cage Hang given the climb rates of both alliances.
 
            Tone: Professional, High-Stakes Tactical Briefing. Do not use markdown. Please limit your response to 400 words.
        `;

        const response = await client.chat.send({
            model: 'google/gemini-3-pro-preview',
            messages: [
                { role: 'system', content: 'You are an FRC Elite Strategy Analyst.' },
                { role: 'user', content: prompt }
            ],
            stream: false,
        });

        return (response.choices[0]?.message?.content as string) || "Strategy generation offline.";
    } catch (e) {
        console.error("AI Strategy Error:", e);
        return "Tactical link severed.";
    }
}

export async function generateAllianceDraft(targetTeam: string, allTeamsData: any[]) {
    try {
        const teamProfiles = allTeamsData.map(t => `
            Team ${t.teamKey}: Avg L4: ${t.avgL4}, Algae: ${t.maxAlgae}, Climb: ${t.climbRate}%
        `).join('\n');

        const prompt = `
            You are the Alliance Captain for FRC Team ${targetTeam} in REEFSCAPE.
            Drafting for PLAYOFFS (Ignore RPs, focus ONLY on points and winning).

            Available Teams List (Stats):
            ${teamProfiles}

            ${REEFSCAPE_CONTEXT}

            Task:
            1. **Comprehensive Ranking**: Rank EVERY viable team from the list from best to worst options for our alliance.
            2. **Tier Groups**: Group them into 'Tier 1 (Priority Picks)', 'Tier 2 (Strong Complement)', and 'Tier 3 (Backup)'.
            3. **Primary Recommendations**: Specifically identify who should be our 1st Pick and 2nd Pick.
            4. **Strategic Logic**: Explain the strategy based on point-scoring potential and winning matchups (e.g., scoring at different reef levels or specialized Algae clearing).

            Provide a professional draft analysis report. Use a high-impact, tactical tone.
        `;

        const response = await client.chat.send({
            model: 'google/gemini-3-pro-preview',
            messages: [
                { role: 'system', content: 'You are an FRC Strategy Specialist.' },
                { role: 'user', content: prompt }
            ],
            stream: false,
        });

        return (response.choices[0]?.message?.content as string) || "Draft advisor offline.";
    } catch (e) {
        console.error("AI Draft Error:", e);
        return "Intelligence link severed.";
    }
}

export async function generateEventStrategy(eventKey: string, topTeams: any[]) {
    try {
        const leaderboard = topTeams.map((t, i) => `#${i + 1} Team ${t.teamKey}: Avg L4 ${t.avgL4}, Prob Top 1: ${t.prob}`).join('\n');

        const prompt = `
            Analyze the current state of FRC Event ${eventKey} (Reefscape 2025).
            Based on the Top 10 predicted leaderboard:
            ${leaderboard}

            ${REEFSCAPE_CONTEXT}

            Task:
            1. **Event Narrative**: Provide a 2-sentence summary of the competition landscape (e.g., "Team 6377 is dominating the L4 cycle game, but Team X is closing in with superior Algae processing").
            2. **Strategic Pivot**: What should teams in the 5-10 rank range do to disrupt the top tier?
            3. **Key Matchups**: Identify which "profiles" are currently winning (Speed vs Complexity).

            Keep the tone like a professional sports analyst. Use markdown.
        `;

        const response = await client.chat.send({
            model: 'google/gemini-3-flash-preview',
            messages: [
                { role: 'system', content: 'You are an FRC Lead Strategic Analyst.' },
                { role: 'user', content: prompt }
            ],
            stream: false,
        });

        return (response.choices[0]?.message?.content as string) || "Strategic link offline.";
    } catch (e) {
        console.error("Event strategy error:", e);
        return "Intelligence link severed.";
    }
}

export async function generateTeamStrategy(teamKey: string, nickname: string, reports: any[]) {
    try {
        const stats = {
            avgL4: (reports.reduce((acc, r) => acc + r.data.teleop.coral_l4, 0) / (reports.length || 1)).toFixed(1),
            autoMove: (reports.filter(r => r.data.auto.moved).length / (reports.length || 1) * 100).toFixed(0),
            climbDeep: (reports.filter(r => r.data.teleop.climb === 'Deep').length / (reports.length || 1) * 100).toFixed(0),
            maxAlgae: Math.max(...reports.map(r => r.data.teleop.algae_processor + r.data.teleop.algae_net), 0),
            failures: reports.filter(r => r.data.mech_failure).length,
            avgDefense: (reports.reduce((acc, r) => acc + (r.data.defender_rating || 0), 0) / (reports.length || 1)).toFixed(1)
        };

        const scouterIntel = reports.map(r => `[Match ${r.matchKey.split('_qm').pop()}]: ${r.data.notes || 'No notes.'}`).join('\n');

        const prompt = `
            Analyze Team ${teamKey.replace('frc', '')} (${nickname}) for FRC Reefscape 2025.
            
            Current Intelligence Profile:
            - Average L4 Coral: ${stats.avgL4}
            - Auto Mobility: ${stats.autoMove}%
            - Deep Climb Consistency: ${stats.climbDeep}%
            - Max Algae Harvested: ${stats.maxAlgae}
            - Mechanical Failures: ${stats.failures} in ${reports.length} matches
            - Defense Capability Rating: ${stats.avgDefense}/5

            Scouter Field Observations:
            ${scouterIntel}

            ${REEFSCAPE_CONTEXT}

            Task:
            1. **Scouter Synthesis**: Summarize the "Other Notes" into a cohesive narrative. Mention any specific behavioral quirks or mechanical issues noticed.
            2. **Strategy for Alliance Partners**: How should an alliance best utilize this robot? (e.g. "Primary Coral" vs "Defensive Specialist" vs "Algae Support").
            3. **Opponent Playbook**: How can an opponent shut them down? Consider their reliability and notes.

            Tone: Professional Tactical Intel. Use Markdown.
        `;

        const response = await client.chat.send({
            model: 'google/gemini-3-pro-preview',
            messages: [
                { role: 'system', content: 'You are an FRC Lead Tactical Scout.' },
                { role: 'user', content: prompt }
            ],
            stream: false,
        });

        return (response.choices[0]?.message?.content as string) || "Scouter notes unavailable.";
    } catch (e) {
        console.error("Team strategy error:", e);
        return "Intelligence link severed.";
    }
}
