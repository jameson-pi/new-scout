import Link from 'next/link';
import { getMissionData } from '@/lib/data';
import { calculateSPR } from '@/lib/spr';
import { neutralColors } from '@/lib/designTokens';
import ExportScouterStatsButton from './ExportScouterStatsButton';

export default async function ScouterLeaderboard({ params }: { params: Promise<{ eventKey: string }> }) {
    const { eventKey } = await params;

    // Group pit reports by scouter
    // (Removed pit scouting logic since we now track private match notes length)

    const missionData = await getMissionData(eventKey) as { reports: any[], tbaMatches: any };
    const reports = missionData.reports;
    const tbaMatches = missionData.tbaMatches;
    const scouterStatsRaw = calculateSPR(reports, tbaMatches);
    
    // otherDataLength is now calculated in calculateSPR as avg note length
    const scouterStats = scouterStatsRaw;

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
        <main className="page-shell responsive-padding">
            <div className="page-content" style={{ maxWidth: '1000px', gap: '4rem' }}>

                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-end reveal mobile-stack" style={{ gap: '2rem' }}>
                    <div className="page-header">
                        <Link href={`/event/${eventKey}`} className="page-back-link">
                            ← Back to event dashboard
                        </Link>
                        <h1 className="text-gradient page-title" style={{ fontStyle: 'italic' }}>
                            Scouter<span className="text-primary">Intel</span>
                        </h1>
                        <p className="page-subtitle">Live {eventKey.replace(/^\d{4}/, '').toUpperCase()} performance • {filteredStats.length} active scouters</p>
                    </div>
                    <div className="flex" style={{ gap: '1rem' }}>
                        <ExportScouterStatsButton stats={scouterStats} eventKey={eventKey} />
                    </div>
                </header>

                {/* Accuracy Diagnostic Dashboard */}
                <section className="reveal delay-1">
                    <div className="glass section-card" style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: '40px' }}>
                        <p className="section-label" style={{ color: neutralColors.mutedDark }}>Scouting accuracy diagnostics (compared to TBA)</p>
                        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
                            {inaccuracies.map((inc, i) => (
                                <div key={inc.label} className="kpi-row">
                                    <div className="flex justify-between items-end">
                                        <span style={{ fontSize: '11px', fontWeight: 950, color: '#fff' }}>{inc.label}</span>
                                        <span className="data-point-high" style={{ fontSize: '14px', fontWeight: 950, color: inc.color }}>{inc.error.toFixed(1)} pts</span>
                                    </div>
                                    <div className={`progress-bar progress-bar-${inc.color === '#eab308' ? 'medium' : inc.color === 'var(--secondary)' ? 'teal' : 'info'}`}>
                                        <div className="fill" style={{ height: '100%', width: `${Math.min(100, (inc.error / inaccuracies[0].error) * 100)}%` }}></div>
                                    </div>
                                    {i === 0 && <span className="badge-warning" style={{ display: 'inline-block', marginTop: '0.5rem' }}>Highest error</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Scouter Grid */}
                <div style={{ display: 'grid', gap: '1rem' }} className="reveal delay-1">
                    <div className="flex justify-between items-center mobile-hide list-head">
                        <span style={{ fontSize: '10px', fontWeight: 950, color: neutralColors.mutedDarker, textTransform: 'uppercase', letterSpacing: '0.2em' }}>Scouter</span>
                        <div className="flex" style={{ gap: '4rem' }}>
                            <span style={{ fontSize: '10px', fontWeight: 950, color: neutralColors.mutedDarker, textTransform: 'uppercase', letterSpacing: '0.2em', width: '80px', textAlign: 'right' }}>SPR</span>
                            <span style={{ fontSize: '10px', fontWeight: 950, color: neutralColors.mutedDarker, textTransform: 'uppercase', letterSpacing: '0.2em', width: '80px', textAlign: 'right' }}>Reports</span>
                            <span style={{ fontSize: '10px', fontWeight: 950, color: neutralColors.mutedDarker, textTransform: 'uppercase', letterSpacing: '0.2em', width: '80px', textAlign: 'right' }}>Notes</span>
                        </div>
                    </div>

                    {filteredStats.map((s, i) => (
                        <div key={s.scoutId} className="glass flex items-center justify-between leaderboard-card list-item" style={{ position: 'relative', overflow: 'hidden', borderRadius: '30px' }}>
                            <div className="flex items-center" style={{ gap: '2rem' }}>
                                <span style={{ fontSize: '2.5rem', fontWeight: 950, fontStyle: 'italic', color: '#111', width: '40px' }}>{i + 1}</span>
                                <div>
                                    <p style={{ fontSize: '9px', fontWeight: 950, color: s.color, letterSpacing: '0.15em', marginBottom: '0.25rem' }}>{s.status}</p>
                                    <h3 style={{ fontSize: 'clamp(1.5rem, 4vw, 1.75rem)', fontWeight: 950, fontStyle: 'italic', textTransform: 'uppercase', color: '#fff' }}>{s.scoutId}</h3>
                                    <div className="flex items-center" style={{ gap: '0.5rem', marginTop: '0.25rem' }}>
                                        <div className={s.bias > 0 ? 'badge-error' : 'badge-info'} style={{ display: 'inline-block' }}>
                                            {s.bias > 0 ? `▲ Inflation (+${s.bias.toFixed(1)})` : `▼ Deflation (${s.bias.toFixed(1)})`}
                                        </div>
                                        <span className="mobile-hide badge-muted">Bias</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-8 mobile-stack">
                                <div style={{ minWidth: '100px', display: 'grid', gap: '0.25rem' }}>
                                    <div className="flex justify-between" style={{ fontSize: '8px', fontWeight: 950, color: neutralColors.mutedDark, textTransform: 'uppercase' }}>
                                        <span>Auto</span>
                                        <span style={{ color: s.autoError > 3 ? 'var(--accent)' : neutralColors.mutedDark }}>{s.autoError.toFixed(1)}</span>
                                    </div>
                                    <div className="flex justify-between" style={{ fontSize: '8px', fontWeight: 950, color: neutralColors.mutedDark, textTransform: 'uppercase' }}>
                                        <span>Tele</span>
                                        <span style={{ color: s.teleError > 5 ? 'var(--accent)' : neutralColors.mutedDark }}>{s.teleError.toFixed(1)}</span>
                                    </div>
                                    <div className="flex justify-between" style={{ fontSize: '8px', fontWeight: 950, color: neutralColors.mutedDark, textTransform: 'uppercase' }}>
                                        <span>End</span>
                                        <span style={{ color: s.endgameError > 2 ? 'var(--accent)' : neutralColors.mutedDark }}>{s.endgameError.toFixed(1)}</span>
                                    </div>
                                </div>
                                <div className="rank-divider" style={{ width: '1px', height: '2rem', background: 'rgba(255,255,255,0.05)' }}></div>
                                <div style={{ textAlign: 'right', minWidth: '80px' }}>
                                    <p style={{ fontSize: '2rem', fontWeight: 950, fontStyle: 'italic', color: s.spr < 2.5 ? '#22c55e' : '#fff' }}>{s.spr.toFixed(2)}</p>
                                    <p style={{ fontSize: '10px', fontWeight: 950, color: neutralColors.mutedDarker, textTransform: 'uppercase' }}>Precision</p>
                                </div>
                                <div style={{ textAlign: 'right', minWidth: '80px' }}>
                                    <p style={{ fontSize: '2rem', fontWeight: 950, fontStyle: 'italic', color: '#fff' }}>{s.matchesScouted}</p>
                                    <p style={{ fontSize: '10px', fontWeight: 950, color: neutralColors.mutedDarker, textTransform: 'uppercase' }}>Match Reps</p>
                                </div>
                                <div className="rank-divider" style={{ width: '1px', height: '2rem', background: 'rgba(255,255,255,0.05)' }}></div>
                                <div style={{ textAlign: 'right', minWidth: '80px' }}>
                                    <p style={{ fontSize: '2rem', fontWeight: 950, fontStyle: 'italic', color: 'var(--primary)' }}>{Math.round(s.otherDataLength || 0)}</p>
                                    <p style={{ fontSize: '10px', fontWeight: 950, color: neutralColors.mutedDarker, textTransform: 'uppercase' }}>Avg Chars</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Scouter Breakdown Section */}
                <div className="reveal delay-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                    <section className="glass section-card" style={{ borderRadius: '40px' }}>
                        <h3 className="section-label" style={{ marginBottom: '1.25rem' }}>Dynamic SPR model</h3>
                        <p style={{ color: neutralColors.muted, lineHeight: 1.6, fontSize: '0.875rem' }}>
                            The <span style={{ color: '#fff' }}>{eventKey.replace(/^\d{4}/, '').toUpperCase()}</span> dataset contains <span style={{ color: '#fff' }}>{reports.length}</span> individual reports.
                            These rankings are generated by comparing every permutation of your scouts against real-time TBA results for <span style={{ color: '#fff' }}>{Object.keys(tbaMatches).length}</span> matches.
                        </p>
                    </section>

                    <section className="glass section-card" style={{ borderRadius: '40px', borderLeft: '4px solid var(--secondary)' }}>
                        <h3 className="section-label text-secondary" style={{ marginBottom: '1.25rem' }}>Mission integrity</h3>
                        <p style={{ color: neutralColors.muted, lineHeight: 1.6, fontSize: '0.875rem' }}>
                            Scouters with high bias or variance are highlighted in red. These scouts may need re-calibration or additional rule training.
                        </p>
                    </section>
                </div>

            </div>
        </main>
    );
}
