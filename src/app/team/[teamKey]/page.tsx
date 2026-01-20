import Link from 'next/link';
import { getMissionData } from '@/lib/data';
import { getEventTeams } from '@/lib/tba';
import { generateTeamStrategy } from '@/lib/ai';
import ReactMarkdown from 'react-markdown';

export default async function TeamView({ params }: { params: Promise<{ teamKey: string, eventKey: string }> }) {
    const { teamKey } = await params;
    const teamNum = teamKey?.replace('frc', '') || '6377';

    const { reports } = await getMissionData();
    const eventTeams = await getEventTeams('2025txwac');
    const teamInfo = eventTeams.find((t: any) => t.key === teamKey);
    const teamName = teamInfo?.nickname || teamInfo?.name || 'Tactical Unit';

    const teamReports = reports.filter(r => r.teamKey === teamKey);

    // Core Metrics
    const metrics = {
        avgL4: (teamReports.reduce((acc, r) => acc + r.data.teleop.coral_l4, 0) / (teamReports.length || 1)).toFixed(1),
        maxAlgae: Math.max(...teamReports.map(r => r.data.teleop.algae_processor + r.data.teleop.algae_net), 0),
        climbRate: ((teamReports.filter(r => r.data.teleop.climb === 'Deep' || r.data.teleop.climb === 'Shallow').length / (teamReports.length || 1)) * 100).toFixed(0),
        autoMove: ((teamReports.filter(r => r.data.auto.moved).length / (teamReports.length || 1)) * 100).toFixed(0),
        avgAutoCoral: (teamReports.reduce((acc, r) => acc + (r.data.auto.coral_l1 + r.data.auto.coral_l2 + r.data.auto.coral_l3 + r.data.auto.coral_l4), 0) / (teamReports.length || 1)).toFixed(1)
    };

    const aiNotes = await generateTeamStrategy(teamKey, teamName, teamReports);

    const matchHistory = teamReports.map(r => {
        const teleScore = (r.data.teleop.coral_l1 * 2 + r.data.teleop.coral_l2 * 3 + r.data.teleop.coral_l3 * 4 + r.data.teleop.coral_l4 * 5 + r.data.teleop.algae_processor * 6 + r.data.teleop.algae_net * 4);
        const autoScore = (r.data.auto.coral_l1 * 3 + r.data.auto.coral_l2 * 4 + r.data.auto.coral_l3 * 6 + r.data.auto.coral_l4 * 7 + r.data.auto.algae_processor * 6 + r.data.auto.algae_net * 4 + (r.data.auto.moved ? 3 : 0));
        return {
            match: r.matchKey.split('_qm').pop() || '?',
            total: teleScore + autoScore,
            teleOP: teleScore,
            auto: autoScore
        };
    }).sort((a, b) => parseInt(a.match) - parseInt(b.match));

    return (
        <main style={{ minHeight: '100vh', background: '#000', color: '#fff', padding: '4rem 2rem' }}>
            <div className="mx-auto" style={{ maxWidth: '1200px', display: 'grid', gap: '4rem' }}>

                {/* Tactical Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-end reveal" style={{ gap: '2rem' }}>
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                        <Link href={`/event/2025txwac`} style={{ fontSize: '10px', fontWeight: 950, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--primary)', textDecoration: 'none', marginBottom: '1.5rem', display: 'block' }}>
                            ← ABORT TO MISSION CONTROL
                        </Link>
                        <h1 className="text-gradient" style={{ fontSize: 'clamp(4rem, 15vw, 10rem)', fontWeight: 950, fontStyle: 'italic', letterSpacing: '-0.05em', lineHeight: 0.8 }}>
                            {teamNum}
                        </h1>
                        <p style={{ fontSize: '1.75rem', fontWeight: 950, fontStyle: 'italic', color: '#555', textTransform: 'uppercase' }}>{teamName}</p>
                    </div>
                    <div className="glass" style={{ padding: '2rem 3rem', borderRadius: '40px', borderLeft: '4px solid var(--secondary)' }}>
                        <p style={{ fontSize: '10px', fontWeight: 950, color: '#444', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '0.5rem' }}>SCOUTING INTEGRITY</p>
                        <p style={{ fontSize: '3.5rem', fontWeight: 950, fontStyle: 'italic', color: '#fff' }}>{teamReports.length} <span style={{ fontSize: '1rem', opacity: 0.3, fontStyle: 'normal' }}>SAMPLES</span></p>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '2rem' }} className="reveal delay-2">
                    <div className="glass" style={{ padding: '2.5rem', borderRadius: '35px' }}>
                        <p style={{ fontSize: '10px', fontWeight: 950, color: '#444', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '1rem' }}>Avg L4 Coral</p>
                        <p style={{ fontSize: '4rem', fontWeight: 950, fontStyle: 'italic', color: '#fff' }}>{metrics.avgL4}</p>
                        <div style={{ marginTop: '1rem', padding: '4px 12px', background: 'rgba(57, 255, 20, 0.1)', color: 'var(--secondary)', fontSize: '10px', fontWeight: 950, borderRadius: '6px', display: 'inline-block' }}>ELITE SCORER</div>
                    </div>
                    <div className="glass" style={{ padding: '2.5rem', borderRadius: '35px' }}>
                        <p style={{ fontSize: '10px', fontWeight: 950, color: '#444', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '1rem' }}>Auto Mobility</p>
                        <p style={{ fontSize: '4rem', fontWeight: 950, fontStyle: 'italic', color: '#fff' }}>{metrics.autoMove}%</p>
                        <p style={{ fontSize: '10px', color: '#555', fontWeight: 900, marginTop: '0.5rem' }}>AVG AUTO CORAL: {metrics.avgAutoCoral}</p>
                    </div>
                    <div className="glass" style={{ padding: '2.5rem', borderRadius: '35px' }}>
                        <p style={{ fontSize: '10px', fontWeight: 950, color: '#444', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '1rem' }}>Max Algae</p>
                        <p style={{ fontSize: '4rem', fontWeight: 950, fontStyle: 'italic', color: '#fff' }}>{metrics.maxAlgae}</p>
                        <div style={{ marginTop: '1rem', padding: '4px 12px', background: 'rgba(168, 85, 247, 0.1)', color: 'var(--primary)', fontSize: '10px', fontWeight: 950, borderRadius: '6px', display: 'inline-block' }}>PROCESSOR SPEC</div>
                    </div>
                    <div className="glass" style={{ padding: '2.5rem', borderRadius: '35px' }}>
                        <p style={{ fontSize: '10px', fontWeight: 950, color: '#444', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '1rem' }}>Climb Rate</p>
                        <p style={{ fontSize: '4rem', fontWeight: 950, fontStyle: 'italic', color: '#fff' }}>{metrics.climbRate}%</p>
                        <div style={{ marginTop: '1rem', padding: '4px 12px', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '10px', fontWeight: 950, borderRadius: '6px', display: 'inline-block' }}>STABLE HANG</div>
                    </div>
                </div>

                {/* Match Performance Timeline */}
                <section className="reveal delay-3">
                    <div className="glass" style={{ padding: '3rem', borderRadius: '45px' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 950, fontStyle: 'italic', textTransform: 'uppercase', marginBottom: '3rem' }}>Mission Timeline Performance</h2>
                        <div style={{ height: '300px', display: 'flex', alignItems: 'end', gap: '1rem' }}>
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
                            <div key={i} className="glass" style={{ padding: '2rem', borderRadius: '35px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
                                    <span style={{ fontSize: '1.5rem', fontWeight: 950, fontStyle: 'italic', color: 'var(--primary)' }}>{r.matchKey.split('_qm').pop()?.toUpperCase()}</span>
                                    <span style={{ fontSize: '9px', fontWeight: 950, color: '#444', textTransform: 'uppercase' }}>OPERATIVE: {r.scoutId}</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <p style={{ fontSize: '8px', fontWeight: 950, color: '#555', marginBottom: '0.5rem' }}>AUTO SEQUENCE</p>
                                        <p style={{ fontSize: '11px', color: '#888' }}>{r.data.auto.moved ? '✓ MOVED' : '× STATIONARY'}</p>
                                        <p style={{ fontSize: '11px', color: '#fff', fontWeight: 700 }}>{r.data.auto.coral_l4} L4 CORAL</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '8px', fontWeight: 950, color: '#555', marginBottom: '0.5rem' }}>TELEOP OPERATIONS</p>
                                        <p style={{ fontSize: '11px', color: '#fff', fontWeight: 700 }}>{r.data.teleop.coral_l4} L4 CYCLES</p>
                                        <p style={{ fontSize: '11px', color: '#888' }}>CLIMB: {r.data.teleop.climb}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

            </div>
        </main>
    );
}
