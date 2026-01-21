import Link from 'next/link';
import { getMissionData } from '@/lib/data';
import { calculateSPR } from '@/lib/spr';

export default async function ScouterLeaderboard({ params }: { params: Promise<{ eventKey: string }> }) {
    const { eventKey } = await params;
    const { reports, tbaMatches } = await getMissionData(eventKey);
    const scouterStats = calculateSPR(reports, tbaMatches);

    // Filter out scouters with very few matches to keep it clean
    const filteredStats = scouterStats
        .filter(s => s.matchesScouted > 0)
        .map(s => ({
            ...s,
            status: s.spr < 1.0 ? 'SYSTEM AI' : s.spr < 2.0 ? 'ELITE' : s.spr < 3.0 ? 'PRECISION' : 'RELIABLE',
            color: s.spr < 1.0 ? '#22c55e' : s.spr < 2.0 ? 'var(--primary)' : s.spr < 3.0 ? 'var(--secondary)' : 'var(--accent)'
        }));

    // Global Diagnostic Calculation
    const globalCount = filteredStats.length || 1;
    const globalAuto = filteredStats.reduce((acc, s) => acc + s.autoError, 0) / globalCount;
    const globalTele = filteredStats.reduce((acc, s) => acc + s.teleError, 0) / globalCount;
    const globalEnd = filteredStats.reduce((acc, s) => acc + s.endgameError, 0) / globalCount;

    const inaccuracies = [
        { label: 'Autonomous Accuracy', error: globalAuto, color: '#eab308' },
        { label: 'Teleop Cycle Integrity', error: globalTele, color: 'var(--secondary)' },
        { label: 'Endgame Mission Success', error: globalEnd, color: 'var(--primary)' }
    ].sort((a, b) => b.error - a.error);

    return (
        <main style={{ minHeight: '100vh', background: '#000', color: '#fff', padding: '4rem 2rem' }}>
            <div className="mx-auto" style={{ maxWidth: '1000px', display: 'grid', gap: '4rem' }}>

                {/* Cinematic Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-end reveal mobile-stack" style={{ gap: '2rem' }}>
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                        <Link href={`/event/${eventKey}`} style={{ fontSize: '9px', fontWeight: 950, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#444', textDecoration: 'none', marginBottom: '1rem', display: 'block' }}>
                            ← BACK TO MISSION CONTROL
                        </Link>
                        <h1 className="text-gradient" style={{ fontSize: 'clamp(3rem, 10vw, 6rem)', fontWeight: 950, fontStyle: 'italic', letterSpacing: '-0.05em', lineHeight: 1 }}>
                            SCOUTER<span className="text-primary">INTEL</span>
                        </h1>
                        <p style={{ color: '#555', fontSize: '1.25rem', fontWeight: 500 }}>Live {eventKey.split('2025')[1].toUpperCase()} Performance • {filteredStats.length} Operatives Active</p>
                    </div>
                </header>

                {/* Accuracy Diagnostic Dashboard */}
                <section className="reveal delay-1">
                    <div className="glass" style={{ padding: '2rem', borderRadius: '40px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <p style={{ fontSize: '10px', fontWeight: 950, color: '#444', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '1.5rem' }}>Field Inaccuracy Diagnostics (Delta to TBA)</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                            {inaccuracies.map((inc, i) => (
                                <div key={inc.label} style={{ display: 'grid', gap: '0.5rem' }}>
                                    <div className="flex justify-between items-end">
                                        <span style={{ fontSize: '11px', fontWeight: 950, color: '#fff' }}>{inc.label}</span>
                                        <span style={{ fontSize: '14px', fontWeight: 950, color: inc.color }}>{inc.error.toFixed(1)} PTS ERROR</span>
                                    </div>
                                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${Math.min(100, (inc.error / inaccuracies[0].error) * 100)}%`, background: inc.color, borderRadius: '10px' }}></div>
                                    </div>
                                    {i === 0 && <span style={{ fontSize: '8px', fontWeight: 950, color: 'var(--accent)', textTransform: 'uppercase' }}>⚠ Critical Recalibration Needed</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Scouter Grid */}
                <div style={{ display: 'grid', gap: '1rem' }} className="reveal delay-1">
                    <div className="flex justify-between items-center mobile-hide" style={{ padding: '0 2rem 1rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ fontSize: '10px', fontWeight: 950, color: '#333', textTransform: 'uppercase', letterSpacing: '0.2em' }}>OPERATIVE</span>
                        <div className="flex" style={{ gap: '4rem' }}>
                            <span style={{ fontSize: '10px', fontWeight: 950, color: '#333', textTransform: 'uppercase', letterSpacing: '0.2em', width: '80px', textAlign: 'right' }}>SPR SCORE</span>
                            <span style={{ fontSize: '10px', fontWeight: 950, color: '#333', textTransform: 'uppercase', letterSpacing: '0.2em', width: '80px', textAlign: 'right' }}>SAMPLES</span>
                        </div>
                    </div>

                    {filteredStats.map((s, i) => (
                        <div key={s.scoutId} className="glass flex items-center justify-between leaderboard-card" style={{ padding: '1.5rem 2rem', borderRadius: '30px', position: 'relative', overflow: 'hidden' }}>
                            <div className="flex items-center" style={{ gap: '2rem' }}>
                                <span style={{ fontSize: '2.5rem', fontWeight: 950, fontStyle: 'italic', color: '#111', width: '40px' }}>{i + 1}</span>
                                <div>
                                    <p style={{ fontSize: '9px', fontWeight: 950, color: s.color, letterSpacing: '0.15em', marginBottom: '0.25rem' }}>{s.status}</p>
                                    <h3 style={{ fontSize: 'clamp(1.5rem, 4vw, 1.75rem)', fontWeight: 950, fontStyle: 'italic', textTransform: 'uppercase', color: '#fff' }}>{s.scoutId}</h3>
                                    <div className="flex items-center" style={{ gap: '0.5rem', marginTop: '0.25rem' }}>
                                        <div style={{ padding: '2px 8px', borderRadius: '4px', background: s.bias > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)', border: `1px solid ${s.bias > 0 ? '#ef4444' : '#3b82f6'}33` }}>
                                            <span style={{ fontSize: '8px', fontWeight: 950, color: s.bias > 0 ? '#ef4444' : '#3b82f6', textTransform: 'uppercase' }}>
                                                {s.bias > 0 ? `▲ INFLATION (+${s.bias.toFixed(1)})` : `▼ DEFLATION (${s.bias.toFixed(1)})`}
                                            </span>
                                        </div>
                                        <span className="mobile-hide" style={{ fontSize: '8px', fontWeight: 700, color: '#444' }}>BIAS TENDENCY</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-8 mobile-stack">
                                <div style={{ minWidth: '100px', display: 'grid', gap: '0.25rem' }}>
                                    <div className="flex justify-between" style={{ fontSize: '8px', fontWeight: 950, color: '#444', textTransform: 'uppercase' }}>
                                        <span>Auto</span>
                                        <span style={{ color: s.autoError > 3 ? 'var(--accent)' : '#666' }}>{s.autoError.toFixed(1)}</span>
                                    </div>
                                    <div className="flex justify-between" style={{ fontSize: '8px', fontWeight: 950, color: '#444', textTransform: 'uppercase' }}>
                                        <span>Tele</span>
                                        <span style={{ color: s.teleError > 5 ? 'var(--accent)' : '#666' }}>{s.teleError.toFixed(1)}</span>
                                    </div>
                                    <div className="flex justify-between" style={{ fontSize: '8px', fontWeight: 950, color: '#444', textTransform: 'uppercase' }}>
                                        <span>End</span>
                                        <span style={{ color: s.endgameError > 2 ? 'var(--accent)' : '#666' }}>{s.endgameError.toFixed(1)}</span>
                                    </div>
                                </div>
                                <div className="rank-divider" style={{ width: '1px', height: '2rem', background: 'rgba(255,255,255,0.05)' }}></div>
                                <div style={{ textAlign: 'right', minWidth: '80px' }}>
                                    <p style={{ fontSize: '2rem', fontWeight: 950, fontStyle: 'italic', color: s.spr < 2.5 ? '#22c55e' : '#fff' }}>{s.spr.toFixed(2)}</p>
                                    <p style={{ fontSize: '10px', fontWeight: 950, color: '#555', textTransform: 'uppercase' }}>Precision</p>
                                </div>
                                <div style={{ textAlign: 'right', minWidth: '80px' }}>
                                    <p style={{ fontSize: '2rem', fontWeight: 950, fontStyle: 'italic', color: '#fff' }}>{s.matchesScouted}</p>
                                    <p style={{ fontSize: '10px', fontWeight: 950, color: '#555', textTransform: 'uppercase' }}>Reports</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Scouter Breakdown Section */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }} className="reveal delay-2">
                    <section className="glass" style={{ padding: '2.5rem', borderRadius: '40px' }}>
                        <h3 style={{ fontSize: '10px', fontWeight: 950, color: '#555', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '1.5rem' }}>Dynamic SPR Model</h3>
                        <p style={{ color: '#888', lineHeight: 1.6, fontSize: '0.875rem' }}>
                            The <span style={{ color: '#fff' }}>{eventKey.split('2025')[1].toUpperCase()}</span> dataset contains <span style={{ color: '#fff' }}>{reports.length}</span> individual reports.
                            These rankings are generated by comparing every permutation of your scouts against real-time TBA results for <span style={{ color: '#fff' }}>{Object.keys(tbaMatches).length}</span> matches.
                        </p>
                    </section>

                    <section className="glass" style={{ padding: '2.5rem', borderRadius: '40px', borderLeft: '4px solid var(--secondary)' }}>
                        <h3 style={{ fontSize: '10px', fontWeight: 950, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '1.5rem' }}>Mission Integrity</h3>
                        <p style={{ color: '#888', lineHeight: 1.6, fontSize: '0.875rem' }}>
                            Operatives with high bias or variance are identified in Red. These scouts may require sensor re-calibration or additional training on Reefscape rules.
                        </p>
                    </section>
                </div>

            </div>
        </main>
    );
}
