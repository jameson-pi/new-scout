import Link from 'next/link';
import { getMissionData } from '@/lib/data';
import { generateMatchStrategy } from '@/lib/ai';
import ReactMarkdown from 'react-markdown';

export default async function MatchStrategyPage({ params }: { params: Promise<{ matchKey: string }> }) {
    const { matchKey } = await params;
    const { reports } = await getMissionData();

    // 1. Identify participants for this match
    const matchReports = reports.filter(r => r.matchKey === matchKey);
    const redTeams = Array.from(new Set(matchReports.filter(r => r.alliance === 'red').map(r => r.teamKey)));
    const blueTeams = Array.from(new Set(matchReports.filter(r => r.alliance === 'blue').map(r => r.teamKey)));

    // 2. Synthesize data for each team
    const getTeamProfile = (tk: string) => {
        const teamReports = reports.filter(r => r.teamKey === tk);
        if (teamReports.length === 0) return { teamKey: tk, avgL4: 0, autoMobility: 0, maxAlgae: 0, climbRate: 0, failures: 0, avgDefense: 0, notes: '' };
        return {
            teamKey: tk,
            avgL4: (teamReports.reduce((acc, r) => acc + r.data.teleop.coral_l4, 0) / teamReports.length).toFixed(1),
            autoMobility: ((teamReports.filter(r => r.data.auto.moved).length / teamReports.length) * 100).toFixed(0),
            maxAlgae: Math.max(...teamReports.map(r => r.data.teleop.algae_processor + r.data.teleop.algae_net), 0),
            climbRate: ((teamReports.filter(r => r.data.teleop.climb === 'Deep').length / teamReports.length) * 100).toFixed(0),
            failures: teamReports.filter(r => r.data.mech_failure).length,
            avgDefense: (teamReports.reduce((acc, r) => acc + (r.data.defender_rating || 0), 0) / teamReports.length).toFixed(1),
            notes: teamReports.map(r => r.data.notes).filter(n => n && n !== 'No notes.').slice(0, 3).join(' | ')
        };
    };

    const redProfiles = redTeams.map(getTeamProfile);
    const blueProfiles = blueTeams.map(getTeamProfile);

    // 3. Generate Strategies using AI (With Opponent Context)
    const redStrategy = await generateMatchStrategy(matchKey, 'red', redProfiles, blueProfiles);
    const blueStrategy = await generateMatchStrategy(matchKey, 'blue', blueProfiles, redProfiles);

    return (
        <main style={{ minHeight: '100vh', background: '#000', color: '#fff', padding: '4rem 2rem' }}>
            <div className="mx-auto" style={{ maxWidth: '1200px', display: 'grid', gap: '3rem' }}>

                <header className="reveal">
                    <Link href={`/event/2025txwac`} style={{ fontSize: '9px', fontWeight: 950, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#444', textDecoration: 'none', marginBottom: '1rem', display: 'block' }}>
                        ← BACK TO WACO ANALYTICS
                    </Link>
                    <h1 className="text-gradient" style={{ fontSize: 'clamp(3rem, 8vw, 5rem)', fontWeight: 950, fontStyle: 'italic', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
                        STRATEGY<span className="text-primary">AI</span>
                    </h1>
                    <p style={{ color: '#555', fontSize: '1.25rem', fontWeight: 500 }}>Tactical Analysis for {matchKey.toUpperCase()}</p>
                </header>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '2rem' }} className="reveal delay-1">

                    {/* Red Alliance Strategy */}
                    <div className="glass" style={{ padding: '2.5rem', borderRadius: '40px', borderLeft: '4px solid #ef4444' }}>
                        <h2 style={{ fontSize: '2rem', fontWeight: 900, fontStyle: 'italic', color: '#ef4444', marginBottom: '1.5rem' }}>RED ALLIANCE</h2>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                            {redTeams.map(tk => (
                                <span key={tk} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.25rem 0.75rem', borderRadius: '100px', fontSize: '12px', fontWeight: 900 }}>
                                    {tk.replace('frc', '')}
                                </span>
                            ))}
                        </div>
                        <div className="ai-content" style={{ color: '#ccc', lineHeight: 1.8, fontSize: '0.95rem' }}>
                            <ReactMarkdown>{redStrategy}</ReactMarkdown>
                        </div>
                    </div>

                    {/* Blue Alliance Strategy */}
                    <div className="glass" style={{ padding: '2.5rem', borderRadius: '40px', borderLeft: '4px solid #3b82f6' }}>
                        <h2 style={{ fontSize: '2rem', fontWeight: 900, fontStyle: 'italic', color: '#3b82f6', marginBottom: '1.5rem' }}>BLUE ALLIANCE</h2>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                            {blueTeams.map(tk => (
                                <span key={tk} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '0.25rem 0.75rem', borderRadius: '100px', fontSize: '12px', fontWeight: 900 }}>
                                    {tk.replace('frc', '')}
                                </span>
                            ))}
                        </div>
                        <div className="ai-content" style={{ color: '#ccc', lineHeight: 1.8, fontSize: '0.95rem' }}>
                            <ReactMarkdown>{blueStrategy}</ReactMarkdown>
                        </div>
                    </div>

                </div>

                <footer className="reveal delay-2" style={{ padding: '2rem', textAlign: 'center', color: '#333' }}>
                    <p style={{ fontSize: '10px', fontWeight: 950, letterSpacing: '0.2em' }}>POWERED BY HACK CLUB AI OPERATIVE</p>
                </footer>

            </div>
        </main>
    );
}
