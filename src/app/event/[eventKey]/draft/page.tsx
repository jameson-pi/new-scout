import Link from 'next/link';
import { getMissionData } from '@/lib/data';
import { generateAllianceDraft } from '@/lib/ai';
import { getEventTeams } from '@/lib/tba';
import ReactMarkdown from 'react-markdown';

export default async function DraftAdvisorPage({ params }: { params: Promise<{ eventKey: string }> }) {
    const { eventKey } = await params;
    const { reports } = await getMissionData(eventKey);
    const eventTeams = await getEventTeams(eventKey);

    // Map team keys to nicknames
    const teamNameMap: Record<string, string> = {};
    eventTeams.forEach((t: any) => {
        teamNameMap[t.key] = t.nickname || t.team_number.toString();
    });

    // 1. Synthesize profiles for all teams at the event
    const uniqueTeams = Array.from(new Set(reports.map(r => r.teamKey)));
    const allProfiles = uniqueTeams.map(tk => {
        const teamReports = reports.filter(r => r.teamKey === tk);
        return {
            teamKey: tk,
            name: teamNameMap[tk] || 'UNIT',
            avgL4: (teamReports.reduce((acc, r) => acc + r.data.teleop.coral_l4, 0) / teamReports.length).toFixed(1),
            maxAlgae: Math.max(...teamReports.map(r => r.data.teleop.algae_processor + r.data.teleop.algae_net), 0),
            climbRate: ((teamReports.filter(r => r.data.teleop.climb === 'Deep').length / teamReports.length) * 100).toFixed(0)
        };
    });

    // 2. Generate Draft Advice
    // Defaulting target team to 6377 (Howdy Bots) as the primary user team
    const draftAdvice = await generateAllianceDraft('6377', allProfiles);

    return (
        <main style={{ minHeight: '100vh', background: '#000', color: '#fff', padding: '4rem 2rem' }}>
            <div className="mx-auto" style={{ maxWidth: '1200px', display: 'grid', gap: '3rem' }}>

                <header className="reveal">
                    <Link href={`/event/${eventKey}`} style={{ fontSize: '9px', fontWeight: 950, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#444', textDecoration: 'none', marginBottom: '1rem', display: 'block' }}>
                        ← BACK TO MISSION ANALYTICS
                    </Link>
                    <h1 className="text-gradient" style={{ fontSize: 'clamp(3rem, 8vw, 5rem)', fontWeight: 950, fontStyle: 'italic', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
                        DRAFT<span className="text-secondary">ADVISOR</span>
                    </h1>
                    <p style={{ color: '#555', fontSize: '1.25rem', fontWeight: 500 }}>Playoff Recruitment Strategy for Team 6377</p>
                </header>

                <div className="reveal delay-1">
                    <div className="glass" style={{ padding: '3rem', borderRadius: '40px', borderTop: '4px solid var(--secondary)' }}>
                        <div className="flex justify-between items-center" style={{ marginBottom: '2.5rem' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 950, fontStyle: 'italic', textTransform: 'uppercase' }}>Intelligence Report</h2>
                            <span style={{ fontSize: '10px', fontWeight: 900, background: 'rgba(57, 255, 20, 0.1)', color: 'var(--secondary)', padding: '0.5rem 1rem', borderRadius: '100px' }}>
                                LIVE SYNTHESIS ACTIVE
                            </span>
                        </div>

                        <div className="ai-content" style={{ color: '#ccc', lineHeight: 1.8, fontSize: '1rem', fontFamily: 'var(--font-geist-mono), monospace' }}>
                            <ReactMarkdown>{draftAdvice}</ReactMarkdown>
                        </div>
                    </div>
                </div>

                <div className="reveal delay-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                    <div className="glass" style={{ padding: '1.5rem', borderRadius: '25px', opacity: 0.5 }}>
                        <p style={{ fontSize: '9px', fontWeight: 950, color: '#444', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Constraint: Complementarity</p>
                        <p style={{ fontSize: '0.875rem', color: '#666' }}>Prioritizing L1/Algae specialists to complement high-L4 scoring.</p>
                    </div>
                    <div className="glass" style={{ padding: '1.5rem', borderRadius: '25px', opacity: 0.5 }}>
                        <p style={{ fontSize: '9px', fontWeight: 950, color: '#444', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Constraint: Reliability</p>
                        <p style={{ fontSize: '0.875rem', color: '#666' }}>Climb consistency is weighted heavily for playoff durability.</p>
                    </div>
                </div>

                <footer style={{ padding: '2rem', textAlign: 'center', color: '#222' }}>
                    <p style={{ fontSize: '9px', fontWeight: 950, letterSpacing: '0.3em' }}>ALGORITHM: BAYESIAN PLAYOFF PREFERENCE • REEFSCAPE-25</p>
                </footer>

            </div>
        </main>
    );
}
