import Link from 'next/link';
import { getMissionData } from '@/lib/data';
import { getEventTeams } from '@/lib/tba';
import { generateTeamStrategy } from '@/lib/ai';
import ReactMarkdown from 'react-markdown';

export default async function TeamView({ params }: { params: Promise<{ teamKey: string, eventKey: string }> }) {
    const { teamKey, eventKey } = await params;
    const teamNum = teamKey?.replace('frc', '') || '6377';

    const { reports } = await getMissionData(eventKey);
    const eventTeams = await getEventTeams(eventKey);
    const teamInfo = eventTeams.find((t: any) => t.key === teamKey);
    const teamName = teamInfo?.nickname || teamInfo?.name || 'Tactical Unit';

    const teamReports = reports.filter(r => r.teamKey === teamKey).sort((a, b) => {
        const getNum = (key: string) => parseInt(key.split('_qm').pop() || '0') || 0;
        return getNum(a.matchKey) - getNum(b.matchKey);
    });

    // Core Metrics
    const metrics = {
        avgL4: (teamReports.reduce((acc, r) => acc + (r.data.teleop.coral_l4 || 0), 0) / (teamReports.length || 1)).toFixed(1),
        maxAlgae: Math.max(...teamReports.map(r => (r.data.teleop.algae_processor || 0) + (r.data.teleop.algae_net || 0)), 0),
        climbRate: ((teamReports.filter(r => r.data.teleop.climb === 'Deep' || r.data.teleop.climb === 'Shallow').length / (teamReports.length || 1)) * 100).toFixed(0),
        autoMove: ((teamReports.filter(r => r.data.auto.moved).length / (teamReports.length || 1)) * 100).toFixed(0),
        avgAutoCoral: (teamReports.reduce((acc, r) => acc + ((r.data.auto.coral_l1 || 0) + (r.data.auto.coral_l2 || 0) + (r.data.auto.coral_l3 || 0) + (r.data.auto.coral_l4 || 0)), 0) / (teamReports.length || 1)).toFixed(1)
    };

    const aiNotes = (await generateTeamStrategy(teamKey, teamName, teamReports)).replace(/\r\n/g, '\n');

    const matchHistory = teamReports.map(r => {
        const d = r.data;
        const teleScore = ((d.teleop.coral_l1 || 0) * 2 + (d.teleop.coral_l2 || 0) * 3 + (d.teleop.coral_l3 || 0) * 4 + (d.teleop.coral_l4 || 0) * 5 + (d.teleop.algae_processor || 0) * 6 + (d.teleop.algae_net || 0) * 4);
        const autoScore = ((d.auto.coral_l1 || 0) * 3 + (d.auto.coral_l2 || 0) * 4 + (d.auto.coral_l3 || 0) * 6 + (d.auto.coral_l4 || 0) * 7 + (d.auto.algae_processor || 0) * 6 + (d.auto.algae_net || 0) * 4 + (d.auto.moved ? 3 : 0));
        return {
            match: r.matchKey.split('_qm').pop() || '0',
            total: teleScore + autoScore,
            teleOP: teleScore,
            auto: autoScore
        };
    }).sort((a, b) => (parseInt(a.match) || 0) - (parseInt(b.match) || 0));

    return (
        <main style={{ minHeight: '100vh', background: '#000', color: '#fff', padding: '4rem 2rem' }}>
            <div className="mx-auto" style={{ maxWidth: '1200px', display: 'grid', gap: '4rem' }}>

                {/* Tactical Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-end reveal mobile-stack" style={{ gap: '2rem' }}>
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                        <Link href={`/event/${eventKey}`} style={{ fontSize: '10px', fontWeight: 950, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--primary)', textDecoration: 'none', marginBottom: '1.5rem', display: 'block' }}>
                            ← ABORT TO {eventKey.split('2025')[1]?.toUpperCase() || 'MISSION'} CONTROL
                        </Link>
                        <h1 className="text-gradient" style={{ fontSize: 'clamp(4rem, 12vw, 8rem)', fontWeight: 950, fontStyle: 'italic', letterSpacing: '-0.05em', lineHeight: 0.8 }}>
                            {teamNum}
                        </h1>
                        <p style={{ fontSize: 'clamp(1.25rem, 4vw, 1.75rem)', fontWeight: 950, fontStyle: 'italic', color: '#555', textTransform: 'uppercase' }}>{teamName}</p>
                    </div>
                    <div className="glass w-full md:w-auto" style={{ padding: '2rem 3rem', borderRadius: '40px', borderLeft: '4px solid var(--secondary)', textAlign: 'center' }}>
                        <p style={{ fontSize: '10px', fontWeight: 950, color: '#444', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '0.5rem' }}>SCOUTING INTEGRITY</p>
                        <p style={{ fontSize: '3rem', fontWeight: 950, fontStyle: 'italic', color: '#fff' }}>{teamReports.length} <span style={{ fontSize: '1rem', opacity: 0.3, fontStyle: 'normal' }}>SAMPLES</span></p>
                    </div>
                </header>

                {/* AI Intelligence Block */}
                <section className="reveal delay-1">
                    <div className="glass" style={{ padding: '3rem', borderRadius: '45px', background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08) 0%, transparent 100%)', borderTop: '1px solid rgba(168, 85, 247, 0.2)' }}>
                        <div className="flex items-center" style={{ gap: '1rem', marginBottom: '2rem' }}>
                            <span style={{ fontSize: '11px', fontWeight: 950, color: 'var(--primary)', letterSpacing: '0.3em', textTransform: 'uppercase' }}>Tactical Intel Briefing</span>
                            <div style={{ height: '1px', flex: 1, background: 'rgba(168, 85, 247, 0.1)' }}></div>
                        </div>
                        <div style={{ fontSize: '1.15rem', color: '#ccc', lineHeight: 1.8 }}>
                            <ReactMarkdown>{aiNotes}</ReactMarkdown>
                        </div>
                    </div>
                </section>

                {/* Metric Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1.5rem' }} className="reveal delay-2">
                    <div className="glass" style={{ padding: '1.5rem', borderRadius: '30px' }}>
                        <p style={{ fontSize: '10px', fontWeight: 950, color: '#444', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.5rem' }}>Avg L4 Coral</p>
                        <p style={{ fontSize: '2.5rem', fontWeight: 950, fontStyle: 'italic', color: '#fff' }}>{metrics.avgL4}</p>
                    </div>
                    <div className="glass" style={{ padding: '1.5rem', borderRadius: '30px' }}>
                        <p style={{ fontSize: '10px', fontWeight: 950, color: '#444', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.5rem' }}>Auto Mobility</p>
                        <p style={{ fontSize: '2.5rem', fontWeight: 950, fontStyle: 'italic', color: '#fff' }}>{metrics.autoMove}%</p>
                    </div>
                    <div className="glass" style={{ padding: '1.5rem', borderRadius: '30px' }}>
                        <p style={{ fontSize: '10px', fontWeight: 950, color: '#444', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.5rem' }}>Max Algae</p>
                        <p style={{ fontSize: '2.5rem', fontWeight: 950, fontStyle: 'italic', color: '#fff' }}>{metrics.maxAlgae}</p>
                    </div>
                    <div className="glass" style={{ padding: '1.5rem', borderRadius: '30px' }}>
                        <p style={{ fontSize: '10px', fontWeight: 950, color: '#444', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.5rem' }}>Climb Rate</p>
                        <p style={{ fontSize: '2.5rem', fontWeight: 950, fontStyle: 'italic', color: '#fff' }}>{metrics.climbRate}%</p>
                    </div>
                </div>

                {/* Match Performance Timeline */}
                <section className="reveal delay-3">
                    <div className="glass" style={{ padding: '3rem', borderRadius: '45px' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 950, fontStyle: 'italic', textTransform: 'uppercase', marginBottom: '3rem' }}>Mission Timeline Performance</h2>
                        <div style={{ width: '100%', overflowX: 'auto', paddingBottom: '1rem' }}>
                            <div style={{ minWidth: '600px', height: '300px', display: 'flex', alignItems: 'end', gap: '1rem' }}>
                                {matchHistory.map((m, i) => (
                                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'end', height: '100%', gap: '0.5rem' }}>
                                        <div className="flex flex-col gap-1" style={{ height: '80%' }}>
                                            <div style={{ height: `${(m.teleOP / 80) * 100}%`, background: 'var(--primary)', borderRadius: '8px' }} title="Teleop"></div>
                                            <div style={{ height: `${(m.auto / 80) * 100}%`, background: 'var(--secondary)', borderRadius: '8px' }} title="Auto"></div>
                                        </div>
                                        <span style={{ textAlign: 'center', fontSize: '11px', fontWeight: 950, color: '#444' }}>QM{m.match}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-4" style={{ marginTop: '2rem' }}>
                            <div className="flex items-center gap-2">
                                <div style={{ width: '12px', height: '12px', background: 'var(--primary)', borderRadius: '3px' }}></div>
                                <span style={{ fontSize: '10px', fontWeight: 900, color: '#666' }}>TELEOP OPS</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div style={{ width: '12px', height: '12px', background: 'var(--secondary)', borderRadius: '3px' }}></div>
                                <span style={{ fontSize: '10px', fontWeight: 900, color: '#666' }}>AUTO OPS</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Detailed Report Cards */}
                <section className="reveal delay-4" style={{ marginBottom: '4rem' }}>
                    <h2 style={{ fontSize: '11px', fontWeight: 950, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#444', marginBottom: '2rem' }}>Mission Data Logs</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
                        {teamReports.map((r, i) => (
                            <div key={`${r.matchKey}-${i}`} className="glass" style={{ padding: '2rem', borderRadius: '35px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
                                    <span style={{ fontSize: '1.5rem', fontWeight: 950, fontStyle: 'italic', color: 'var(--primary)' }}>{r.matchKey.split('_qm').pop()?.toUpperCase()}</span>
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ fontSize: '9px', fontWeight: 950, color: '#444', textTransform: 'uppercase' }}>OPERATIVE: {r.scoutId}</p>
                                        <p style={{ fontSize: '9px', fontWeight: 950, color: 'var(--secondary)', textTransform: 'uppercase' }}>DEFENSE: {r.data.defender_rating || 3}/5</p>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <p style={{ fontSize: '8px', fontWeight: 950, color: '#555', marginBottom: '0.5rem' }}>AUTO SEQUENCE</p>
                                        <p style={{ fontSize: '11px', color: '#888' }}>{r.data.auto.moved ? '✓ MOVED' : '× STATIONARY'}</p>
                                        <p style={{ fontSize: '11px', color: '#fff', fontWeight: 700 }}>{(r.data.auto.coral_l1 || 0) + (r.data.auto.coral_l2 || 0) + (r.data.auto.coral_l3 || 0) + (r.data.auto.coral_l4 || 0)} AUTO CORAL</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '8px', fontWeight: 950, color: '#555', marginBottom: '0.5rem' }}>TELEOP OPERATIONS</p>
                                        <p style={{ fontSize: '11px', color: '#fff', fontWeight: 700 }}>{r.data.teleop.coral_l4} L4 CYCLES</p>
                                        <p style={{ fontSize: '11px', color: '#888' }}>CLIMB: {r.data.teleop.climb}</p>
                                        {r.data.mech_failure && <p style={{ fontSize: '11px', color: '#ef4444', fontWeight: 950 }}>● MECH FAILURE</p>}
                                    </div>
                                </div>
                                {r.data.notes && (
                                    <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '15px' }}>
                                        <p style={{ fontSize: '9px', fontWeight: 950, color: '#444', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Field Intel</p>
                                        <p style={{ fontSize: '12px', color: '#ccc', fontStyle: 'italic' }}>"{r.data.notes}"</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>

            </div>
        </main>
    );
}
