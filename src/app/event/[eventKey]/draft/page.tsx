import Link from 'next/link';
import { getMissionData } from '@/lib/data';
import { generateAllianceDraft } from '@/lib/ai';
import { getEventTeams } from '@/lib/tba';
import ReactMarkdown from 'react-markdown';

interface EventTeamLite {
    key: string;
    nickname?: string;
    team_number?: number;
}

const TELE_TOWER: Record<string, number> = { Level1: 10, Level2: 20, Level3: 30, None: 0, 'No Attempt': 0 };

export default async function DraftAdvisorPage({ params }: { params: Promise<{ eventKey: string }> }) {
    const { eventKey } = await params;
    const { reports } = await getMissionData(eventKey);
    const eventTeams = await getEventTeams(eventKey) as EventTeamLite[];

    const teamNameMap: Record<string, string> = {};
    eventTeams.forEach((t) => {
        teamNameMap[t.key] = t.nickname || String(t.team_number ?? t.key.replace('frc', ''));
    });

    // 1. Synthesize profiles for all teams (REBUILT 2026)
    const uniqueTeams = Array.from(new Set(reports.map(r => r.teamKey)));
    const allProfiles = uniqueTeams.map(tk => {
        const teamReports = reports.filter(r => r.teamKey === tk);
        return {
            teamKey: tk,
            name: teamNameMap[tk] || 'UNIT',
            avgFuel: (teamReports.reduce((acc, r) => acc + r.data.auto.fuel_scored + r.data.teleop.fuel_scored, 0) / teamReports.length).toFixed(1),
            avgTowerPts: (teamReports.reduce((acc, r) => acc + (TELE_TOWER[r.data.teleop.climb_level as keyof typeof TELE_TOWER] || 0), 0) / teamReports.length).toFixed(1),
            towerRate: ((teamReports.filter(r => r.data.teleop.climb_level !== 'No Attempt').length / teamReports.length) * 100).toFixed(0)
        };
    });

    // 2. Generate Draft Advice
    const draftAdvice = await generateAllianceDraft('6377', allProfiles);

    return (
        <main className="responsive-padding" style={{ minHeight: '100vh', background: '#000', color: '#fff', padding: '4rem 2rem' }}>
            <div className="mx-auto" style={{ maxWidth: '1200px', display: 'grid', gap: '3rem' }}>

                <header className="reveal">
                    <Link href={`/event/${eventKey}`} style={{ fontSize: '9px', fontWeight: 950, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#444', textDecoration: 'none', marginBottom: '1rem', display: 'block' }}>
                        ← Back to event dashboard
                    </Link>
                    <h1 className="text-gradient" style={{ fontSize: 'clamp(3rem, 8vw, 5rem)', fontWeight: 950, fontStyle: 'italic', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
                        Draft<span className="text-secondary">Advisor</span>
                    </h1>
                    <p style={{ color: '#555', fontSize: '1.25rem', fontWeight: 500 }}>Playoff pick recommendations for Team 6377</p>
                </header>

                <div className="reveal delay-1">
                    <div className="glass" style={{ padding: '3rem', borderRadius: '40px', borderTop: '4px solid var(--secondary)' }}>
                        <div className="flex justify-between items-center" style={{ marginBottom: '2.5rem' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 950, fontStyle: 'italic', textTransform: 'uppercase' }}>Recommendation Report</h2>
                            <span style={{ fontSize: '10px', fontWeight: 900, background: 'rgba(57, 255, 20, 0.1)', color: 'var(--secondary)', padding: '0.5rem 1rem', borderRadius: '100px' }}>
                                Analysis complete
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
                        <p style={{ fontSize: '0.875rem', color: '#666' }}>Prioritizes strong climbers and hub-control teams to complement high-fuel scorers.</p>
                    </div>
                    <div className="glass" style={{ padding: '1.5rem', borderRadius: '25px', opacity: 0.5 }}>
                        <p style={{ fontSize: '9px', fontWeight: 950, color: '#444', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Constraint: Reliability</p>
                        <p style={{ fontSize: '0.875rem', color: '#666' }}>Weights climb consistency and shift-aware scoring for playoff reliability.</p>
                    </div>
                </div>

                <footer style={{ padding: '2rem', textAlign: 'center', color: '#222' }}>
                    <p style={{ fontSize: '9px', fontWeight: 950, letterSpacing: '0.3em' }}>Model: playoff draft synthesis • rebuilt-26</p>
                </footer>

            </div>
        </main>
    );
}
