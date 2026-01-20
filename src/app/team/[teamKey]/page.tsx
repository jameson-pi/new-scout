import Link from 'next/link';
import { getMissionData } from '@/lib/data';
import { synthesizeReports } from '@/lib/synthesis';

export default async function TeamView({ params }: { params: Promise<{ teamKey: string, eventKey: string }> }) {
    const { teamKey } = await params;
    const teamNum = teamKey?.replace('frc', '') || '6377';

    const { reports, tbaMatches } = await getMissionData();
    const teamReports = reports.filter(r => r.teamKey === teamKey || r.teamKey === `frc${teamNum}`);

    // Synthesize performance for context
    const synthesis = synthesizeReports(teamReports, []); // Empty scouter models for now

    const teamName = teamNum === '6377' ? 'HOWDY BOTS' : 'ROBOTIC UNIT';

    // Calculate actual metrics from CSV
    const avgL4 = teamReports.length > 0
        ? (teamReports.reduce((acc, r) => acc + r.data.teleop.coral_l4, 0) / teamReports.length).toFixed(1)
        : '0.0';

    const matchHistory = teamReports.map(r => ({
        match: r.matchKey.split('_').pop()?.toUpperCase() || 'QM?',
        score: (r.data.teleop.coral_l1 * 2 + r.data.teleop.coral_l2 * 3 + r.data.teleop.coral_l3 * 4 + r.data.teleop.coral_l4 * 5)
    })).slice(0, 12);

    return (
        <main style={{ minHeight: '100vh', background: '#000', color: '#fff', padding: '4rem 2rem' }}>
            <div className="mx-auto" style={{ maxWidth: '1200px', display: 'grid', gap: '3rem' }}>

                {/* Visual Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-end reveal" style={{ gap: '2rem' }}>
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                        <Link href={`/event/2025txwac`} style={{ fontSize: '9px', fontWeight: 950, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#444', textDecoration: 'none', marginBottom: '1rem', display: 'block' }}>
                            ← BACK TO 2025txwac
                        </Link>
                        <h1 className="text-gradient" style={{ fontSize: 'clamp(4rem, 15vw, 8rem)', fontWeight: 950, fontStyle: 'italic', letterSpacing: '-0.05em', lineHeight: 1 }}>
                            {teamNum}
                        </h1>
                        <p style={{ fontSize: '1.5rem', fontWeight: 900, fontStyle: 'italic', color: 'var(--primary)', textTransform: 'uppercase' }}>{teamName}</p>
                    </div>
                    <div className="glass" style={{ padding: '1.5rem 2.5rem', borderRadius: '30px', textAlign: 'right' }}>
                        <p style={{ fontSize: '9px', fontWeight: 950, color: '#444', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.25rem' }}>Data Integrity</p>
                        <p style={{ fontSize: '3rem', fontWeight: 950, fontStyle: 'italic', color: 'var(--secondary)' }}>{teamReports.length} <span style={{ fontSize: '0.875rem', opacity: 0.3, color: '#fff', fontStyle: 'normal' }}>SAMPLES</span></p>
                    </div>
                </header>

                {/* Hero Metric Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }} className="reveal delay-1">
                    <div className="glass" style={{ padding: '2rem', borderRadius: '30px', position: 'relative', overflow: 'hidden' }}>
                        <p style={{ fontSize: '9px', fontWeight: 950, color: '#444', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.5rem' }}>Avg L4 Coral</p>
                        <p style={{ fontSize: '3rem', fontWeight: 950, fontStyle: 'italic', letterSpacing: '-0.05em' }}>{avgL4}</p>
                        <p style={{ fontSize: '9px', fontWeight: 900, color: 'var(--primary)', marginTop: '0.5rem' }}>SCORING WEIGHT: ELITE</p>
                    </div>

                    <div className="glass" style={{ padding: '2rem', borderRadius: '30px', position: 'relative', overflow: 'hidden' }}>
                        <p style={{ fontSize: '9px', fontWeight: 950, color: '#444', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.5rem' }}>Autonomous Moved</p>
                        <p style={{ fontSize: '3rem', fontWeight: 950, fontStyle: 'italic', letterSpacing: '-0.05em' }}>{((teamReports.filter(r => r.data.auto.moved).length / teamReports.length) * 100).toFixed(0)}%</p>
                        <p style={{ fontSize: '9px', fontWeight: 900, color: 'var(--secondary)', marginTop: '0.5rem' }}>RELIABILITY INDEX</p>
                    </div>

                    <div className="glass" style={{ padding: '2rem', borderRadius: '30px', position: 'relative', overflow: 'hidden' }}>
                        <p style={{ fontSize: '9px', fontWeight: 950, color: '#444', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.5rem' }}>Max Algae/Match</p>
                        <p style={{ fontSize: '3rem', fontWeight: 950, fontStyle: 'italic', letterSpacing: '-0.05em' }}>{Math.max(...teamReports.map(r => r.data.teleop.algae_processor + r.data.teleop.algae_net), 0)}</p>
                        <p style={{ fontSize: '9px', fontWeight: 900, color: 'var(--accent)', marginTop: '0.5rem' }}>FIELD CONTROL</p>
                    </div>

                    <div className="glass" style={{ padding: '2rem', borderRadius: '30px', position: 'relative', overflow: 'hidden' }}>
                        <p style={{ fontSize: '9px', fontWeight: 950, color: '#444', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.5rem' }}>Deep Climb Rate</p>
                        <p style={{ fontSize: '3rem', fontWeight: 950, fontStyle: 'italic', letterSpacing: '-0.05em' }}>{((teamReports.filter(r => r.data.teleop.climb === 'Deep').length / teamReports.length) * 100).toFixed(0)}%</p>
                        <p style={{ fontSize: '9px', fontWeight: 900, color: '#fff', marginTop: '0.5rem' }}>STABILITY SCORE</p>
                    </div>
                </div>

                {/* Match Performance Chart Block */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginTop: '2rem' }} className="reveal delay-2">
                    <div className="glass" style={{ gridColumn: 'span min(2, 4)', padding: '2.5rem', borderRadius: '40px' }}>
                        <div className="flex justify-between items-end" style={{ marginBottom: '3rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 950, fontStyle: 'italic', textTransform: 'uppercase' }}>Waco Match Curve</h3>
                                <p style={{ fontSize: '11px', color: '#444', fontWeight: 600 }}>Historical Performance - Teleop Scoring (Normalized)</p>
                            </div>
                        </div>

                        <div style={{ height: '200px', display: 'flex', alignItems: 'end', gap: '0.5rem' }}>
                            {matchHistory.map((m, i) => (
                                <div key={i} style={{ flex: 1, background: 'rgba(255,255,255,0.03)', borderRadius: '8px 8px 0 0', position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'end' }}>
                                    <div style={{ height: `${Math.min(100, (m.score / 50) * 100)}%`, background: 'linear-gradient(to top, var(--primary), var(--secondary))', borderRadius: '8px 8px 0 0', opacity: 0.6 }}></div>
                                    <span style={{ position: 'absolute', bottom: '-20px', left: '50%', transform: 'translateX(-50%)', fontSize: '8px', color: '#333', fontWeight: 900 }}>{m.match}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="glass" style={{ padding: '2.5rem', borderRadius: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div style={{ display: 'grid', gap: '1.5rem' }}>
                            <h3 style={{ fontSize: '10px', fontWeight: 950, color: '#444', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Intelligence Feed</h3>
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                {teamReports.slice(0, 3).map((r, i) => (
                                    <div key={i} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '15px', display: 'grid', gap: '0.25rem' }}>
                                        <div className="flex justify-between">
                                            <span style={{ fontSize: '9px', fontWeight: 950, color: 'var(--primary)' }}>{r.matchKey.toUpperCase()}</span>
                                            <span style={{ fontSize: '9px', fontWeight: 950, color: '#444' }}>SCOUTER: {r.scoutId}</span>
                                        </div>
                                        <p style={{ fontSize: '10px', color: '#888', fontStyle: 'italic' }}>
                                            {r.data.teleop.climb !== 'None' ? `Reliable ${r.data.teleop.climb} climb.` : 'Failed endgame.'}
                                            Managed {r.data.teleop.coral_l4} L4 cycles.
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '2rem', marginTop: '2rem' }}>
                            <p style={{ fontSize: '10px', fontStyle: 'italic', color: '#444', lineHeight: 1.5 }}>
                                * Data synchronized from {teamReports.length} scouter logs. Synthetic synthesis applied to outliers.
                            </p>
                        </div>
                    </div>
                </div>

            </div>
        </main>
    );
}
