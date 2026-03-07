'use client';

import { useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { saveTeamNote, getTeamNote, HIGHLIGHT_TAGS } from '@/lib/notes';

interface TeamDetailClientProps {
    eventKey: string;
    teamKey: string;
    teamNum: string;
    teamName: string;
    teamReports: any[];
    metrics: {
        avgFuel: string;
        avgTowerPts: string;
        towerRate: string;
        autoMove: string;
        avgAutoFuel: string;
    };
    ourEPA: number;
    sbEPA: number | null;
    reliability: {
        failureRate: number;
        failureCount: number;
        matchCount: number;
        consistencyScore: number;
        riskLevel: 'low' | 'medium' | 'high';
    };
    consensus: {
        scouterCount: number;
        overallConsensus: number;
        flaggedMetrics: string[];
    };
    synergyProfile: {
        role: string;
        strengths: string[];
        avgFuel: number;
        avgTowerPts: number;
        towerRate: number;
        defenseRating: number;
        synergyScore: number;
    };
    defenseProfile: {
        defenseRating: number;
        isDefender: boolean;
        effectivenessVsHub: number;
        effectivenessVsTower: number;
        gamesDefended: number;
    };
    aiNotes: string;
    matchHistory: { match: string; total: number; teleOP: number; auto: number }[];
}

export default function TeamDetailClient({
    eventKey, teamKey, teamNum, teamName, teamReports, metrics, ourEPA, sbEPA,
    reliability, consensus, synergyProfile, defenseProfile, aiNotes, matchHistory
}: TeamDetailClientProps) {
    const [note, setNote] = useState(() => getTeamNote(teamKey)?.note || '');
    const [highlights, setHighlights] = useState(() => getTeamNote(teamKey)?.highlights || []);

    const saveNote = () => {
        saveTeamNote(teamKey, note, highlights);
    };

    const toggleHighlight = (tag: string) => {
        const newHighlights = highlights.includes(tag)
            ? highlights.filter(h => h !== tag)
            : [...highlights, tag];
        setHighlights(newHighlights);
        saveTeamNote(teamKey, note, newHighlights);
    };

    const getRiskColor = (risk: string) => {
        if (risk === 'low') return '#22c55e';
        if (risk === 'medium') return '#eab308';
        return '#ef4444';
    };

    const getRoleBadgeColor = (role: string) => {
        const colors: Record<string, string> = {
            'fuel_specialist': '#a855f7',
            'tower_specialist': '#3b82f6',
            'hub_controller': '#22c55e',
            'defender': '#ef4444',
            'balanced': '#888'
        };
        return colors[role] || '#888';
    };

    return (
        <main style={{ minHeight: '100vh', background: '#000', color: '#fff', padding: '4rem 2rem' }}>
            <div className="mx-auto" style={{ maxWidth: '1200px', display: 'grid', gap: '3rem' }}>

                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-end reveal mobile-stack" style={{ gap: '2rem' }}>
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                        <Link href={`/event/${eventKey}`} style={{ fontSize: '10px', fontWeight: 950, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--primary)', textDecoration: 'none', marginBottom: '1rem', display: 'block' }}>
                            ← BACK TO DASHBOARD
                        </Link>
                        <div className="flex items-center gap-4">
                            <h1 className="text-gradient" style={{ fontSize: 'clamp(4rem, 12vw, 7rem)', fontWeight: 950, fontStyle: 'italic', letterSpacing: '-0.05em', lineHeight: 0.8 }}>
                                {teamNum}
                            </h1>
                            <span style={{ background: getRoleBadgeColor(synergyProfile.role), color: '#fff', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 950, textTransform: 'uppercase' }}>
                                {synergyProfile.role.replace('_', ' ')}
                            </span>
                        </div>
                        <p style={{ fontSize: 'clamp(1.25rem, 4vw, 1.5rem)', fontWeight: 950, fontStyle: 'italic', color: '#888', textTransform: 'uppercase' }}>{teamName}</p>
                    </div>
                    <div className="flex gap-4" style={{ flexWrap: 'wrap' }}>
                        <div className="glass" style={{ padding: '1.5rem 2rem', borderRadius: '30px', textAlign: 'center' }}>
                            <p style={{ fontSize: '9px', fontWeight: 950, color: '#888', textTransform: 'uppercase' }}>Our EPA</p>
                            <p style={{ fontSize: '2.5rem', fontWeight: 950, color: 'var(--primary)' }}>{ourEPA.toFixed(1)}</p>
                        </div>
                        <div className="glass" style={{ padding: '1.5rem 2rem', borderRadius: '30px', textAlign: 'center' }}>
                            <p style={{ fontSize: '9px', fontWeight: 950, color: '#888', textTransform: 'uppercase' }}>SB EPA</p>
                            <p style={{ fontSize: '2.5rem', fontWeight: 950, color: '#aaa' }}>{sbEPA?.toFixed(1) || 'N/A'}</p>
                        </div>
                        <div className="glass" style={{ padding: '1.5rem 2rem', borderRadius: '30px', textAlign: 'center' }}>
                            <p style={{ fontSize: '9px', fontWeight: 950, color: '#888', textTransform: 'uppercase' }}>Synergy</p>
                            <p style={{ fontSize: '2.5rem', fontWeight: 950, color: 'var(--secondary)' }}>{synergyProfile.synergyScore.toFixed(0)}</p>
                        </div>
                    </div>
                </header>

                {/* Feature Analysis Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>

                    {/* Reliability */}
                    <div className="glass" style={{ padding: '2rem', borderRadius: '30px', borderTop: `4px solid ${getRiskColor(reliability.riskLevel)}` }}>
                        <h3 style={{ fontSize: '10px', fontWeight: 950, color: '#888', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '1.5rem' }}>Reliability Tracker</h3>
                        <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
                            <span style={{ fontSize: '2rem', fontWeight: 950, color: getRiskColor(reliability.riskLevel) }}>{reliability.riskLevel.toUpperCase()}</span>
                            <span style={{ fontSize: '0.9rem', color: '#888' }}>{reliability.failureCount}/{reliability.matchCount} failures</span>
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                            <div className="flex justify-between" style={{ marginBottom: '0.25rem' }}>
                                <span style={{ fontSize: '9px', fontWeight: 900, color: '#666' }}>RELIABILITY</span>
                                <span style={{ fontSize: '9px', fontWeight: 900, color: '#888' }}>{((1 - reliability.failureRate) * 100).toFixed(0)}%</span>
                            </div>
                            <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                                <div style={{ height: '100%', width: `${(1 - reliability.failureRate) * 100}%`, background: getRiskColor(reliability.riskLevel), borderRadius: '4px' }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between" style={{ marginBottom: '0.25rem' }}>
                                <span style={{ fontSize: '9px', fontWeight: 900, color: '#666' }}>CONSISTENCY</span>
                                <span style={{ fontSize: '9px', fontWeight: 900, color: '#888' }}>{reliability.consistencyScore.toFixed(0)}/100</span>
                            </div>
                            <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                                <div style={{ height: '100%', width: `${reliability.consistencyScore}%`, background: '#3b82f6', borderRadius: '4px' }}></div>
                            </div>
                        </div>
                    </div>

                    {/* Consensus */}
                    <div className="glass" style={{ padding: '2rem', borderRadius: '30px', borderTop: `4px solid ${consensus.overallConsensus >= 75 ? '#22c55e' : '#eab308'}` }}>
                        <h3 style={{ fontSize: '10px', fontWeight: 950, color: '#888', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '1.5rem' }}>Scout Consensus</h3>
                        <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
                            <span style={{ fontSize: '2rem', fontWeight: 950, color: consensus.overallConsensus >= 75 ? '#22c55e' : '#eab308' }}>{consensus.overallConsensus.toFixed(0)}%</span>
                            <span style={{ fontSize: '0.9rem', color: '#888' }}>{consensus.scouterCount} scouters</span>
                        </div>
                        {consensus.flaggedMetrics.length > 0 ? (
                            <div>
                                <p style={{ fontSize: '9px', fontWeight: 900, color: '#ef4444', marginBottom: '0.5rem' }}>⚠️ DISAGREEMENT ON:</p>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    {consensus.flaggedMetrics.map(m => (
                                        <span key={m} style={{ fontSize: '9px', fontWeight: 900, background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '0.25rem 0.5rem', borderRadius: '5px' }}>{m}</span>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <p style={{ fontSize: '0.85rem', color: '#22c55e' }}>✓ All scouts agree on this team's capabilities</p>
                        )}
                    </div>

                    {/* Defense Profile */}
                    <div className="glass" style={{ padding: '2rem', borderRadius: '30px', borderTop: `4px solid ${defenseProfile.isDefender ? '#ef4444' : '#444'}` }}>
                        <h3 style={{ fontSize: '10px', fontWeight: 950, color: '#888', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '1.5rem' }}>Defense Profile</h3>
                        <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
                            <span style={{ fontSize: '2rem', fontWeight: 950, color: defenseProfile.isDefender ? '#ef4444' : '#666' }}>{defenseProfile.defenseRating.toFixed(1)}/5</span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 900, background: defenseProfile.isDefender ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.05)', color: defenseProfile.isDefender ? '#ef4444' : '#666', padding: '0.25rem 0.75rem', borderRadius: '10px' }}>
                                {defenseProfile.isDefender ? 'DEFENDER' : 'SCORER'}
                            </span>
                        </div>
                        {defenseProfile.isDefender && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <p style={{ fontSize: '9px', fontWeight: 900, color: '#666' }}>VS HUB SCORERS</p>
                                    <p style={{ fontSize: '1.25rem', fontWeight: 950, color: '#fff' }}>{defenseProfile.effectivenessVsHub.toFixed(0)}%</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '9px', fontWeight: 900, color: '#666' }}>GAMES DEFENDED</p>
                                    <p style={{ fontSize: '1.25rem', fontWeight: 950, color: '#fff' }}>{defenseProfile.gamesDefended}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Synergy & Strengths */}
                <div className="glass reveal" style={{ padding: '2rem', borderRadius: '30px' }}>
                    <h3 style={{ fontSize: '10px', fontWeight: 950, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '1.5rem' }}>Synergy Profile</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: '9px', fontWeight: 900, color: '#888' }}>AVG FUEL</p>
                            <p style={{ fontSize: '2rem', fontWeight: 950, color: '#a855f7' }}>{synergyProfile.avgFuel.toFixed(1)}</p>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: '9px', fontWeight: 900, color: '#888' }}>AVG TOWER PTS</p>
                            <p style={{ fontSize: '2rem', fontWeight: 950, color: '#3b82f6' }}>{synergyProfile.avgTowerPts.toFixed(1)}</p>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: '9px', fontWeight: 900, color: '#888' }}>TOWER RATE</p>
                            <p style={{ fontSize: '2rem', fontWeight: 950, color: '#22c55e' }}>{synergyProfile.towerRate.toFixed(0)}%</p>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: '9px', fontWeight: 900, color: '#888' }}>DEFENSE</p>
                            <p style={{ fontSize: '2rem', fontWeight: 950, color: '#ef4444' }}>{synergyProfile.defenseRating.toFixed(1)}</p>
                        </div>
                    </div>
                    {synergyProfile.strengths.length > 0 && (
                        <div>
                            <p style={{ fontSize: '9px', fontWeight: 900, color: '#666', marginBottom: '0.5rem' }}>IDENTIFIED STRENGTHS</p>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {synergyProfile.strengths.map(s => (
                                    <span key={s} style={{ fontSize: '0.8rem', fontWeight: 900, background: 'rgba(168, 85, 247, 0.2)', color: 'var(--primary)', padding: '0.5rem 1rem', borderRadius: '20px' }}>{s}</span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Notes & Highlights */}
                <div className="glass reveal" style={{ padding: '2rem', borderRadius: '30px' }}>
                    <h3 style={{ fontSize: '10px', fontWeight: 950, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '1.5rem' }}>Team Notes & Highlights</h3>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <p style={{ fontSize: '9px', fontWeight: 900, color: '#666', marginBottom: '0.5rem' }}>QUICK TAGS</p>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {HIGHLIGHT_TAGS.map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => toggleHighlight(tag)}
                                    style={{
                                        padding: '0.4rem 0.8rem',
                                        borderRadius: '15px',
                                        border: 'none',
                                        background: highlights.includes(tag) ? 'var(--secondary)' : 'rgba(255,255,255,0.05)',
                                        color: highlights.includes(tag) ? '#000' : '#888',
                                        fontWeight: 900,
                                        fontSize: '0.7rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>

                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        onBlur={saveNote}
                        placeholder="Add your notes about this team..."
                        style={{
                            width: '100%',
                            minHeight: '100px',
                            padding: '1rem',
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '15px',
                            color: '#fff',
                            fontSize: '0.9rem',
                            resize: 'vertical'
                        }}
                    />
                </div>

                {/* AI Intelligence */}
                <section className="reveal">
                    <div className="glass" style={{ padding: '2.5rem', borderRadius: '40px', background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08) 0%, transparent 100%)', borderTop: '1px solid rgba(168, 85, 247, 0.2)' }}>
                        <div className="flex items-center" style={{ gap: '1rem', marginBottom: '2rem' }}>
                            <span style={{ fontSize: '11px', fontWeight: 950, color: 'var(--primary)', letterSpacing: '0.3em', textTransform: 'uppercase' }}>AI Tactical Intel</span>
                            <div style={{ height: '1px', flex: 1, background: 'rgba(168, 85, 247, 0.1)' }}></div>
                        </div>
                        <div style={{ fontSize: '1.1rem', color: '#ccc', lineHeight: 1.8 }}>
                            <ReactMarkdown>{aiNotes}</ReactMarkdown>
                        </div>
                    </div>
                </section>

                {/* Metric Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }} className="reveal">
                    <div className="glass" style={{ padding: '1.25rem', borderRadius: '25px', textAlign: 'center' }}>
                        <p style={{ fontSize: '9px', fontWeight: 950, color: '#888', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Avg Fuel</p>
                        <p style={{ fontSize: '2rem', fontWeight: 950, color: '#fff' }}>{metrics.avgFuel}</p>
                    </div>
                    <div className="glass" style={{ padding: '1.25rem', borderRadius: '25px', textAlign: 'center' }}>
                        <p style={{ fontSize: '9px', fontWeight: 950, color: '#888', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Auto Move</p>
                        <p style={{ fontSize: '2rem', fontWeight: 950, color: '#fff' }}>{metrics.autoMove}%</p>
                    </div>
                    <div className="glass" style={{ padding: '1.25rem', borderRadius: '25px', textAlign: 'center' }}>
                        <p style={{ fontSize: '9px', fontWeight: 950, color: '#888', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Avg Tower Pts</p>
                        <p style={{ fontSize: '2rem', fontWeight: 950, color: '#fff' }}>{metrics.avgTowerPts}</p>
                    </div>
                    <div className="glass" style={{ padding: '1.25rem', borderRadius: '25px', textAlign: 'center' }}>
                        <p style={{ fontSize: '9px', fontWeight: 950, color: '#888', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Tower Rate</p>
                        <p style={{ fontSize: '2rem', fontWeight: 950, color: '#fff' }}>{metrics.towerRate}%</p>
                    </div>
                </div>

                {/* Match Performance Timeline */}
                <section className="reveal">
                    <div className="glass" style={{ padding: '2.5rem', borderRadius: '40px' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 950, fontStyle: 'italic', textTransform: 'uppercase', marginBottom: '2rem' }}>Performance Timeline</h2>
                        <div style={{ width: '100%', overflowX: 'auto', paddingBottom: '1rem' }}>
                            <div style={{ minWidth: '500px', height: '250px', display: 'flex', alignItems: 'end', gap: '0.75rem' }}>
                                {matchHistory.map((m, i) => (
                                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'end', height: '100%', gap: '0.5rem' }}>
                                        <div className="flex flex-col gap-1" style={{ height: '80%' }}>
                                            <div style={{ height: `${(m.teleOP / 80) * 100}%`, background: 'var(--primary)', borderRadius: '6px' }} title="Teleop"></div>
                                            <div style={{ height: `${(m.auto / 80) * 100}%`, background: 'var(--secondary)', borderRadius: '6px' }} title="Auto"></div>
                                        </div>
                                        <span style={{ textAlign: 'center', fontSize: '10px', fontWeight: 950, color: '#666' }}>Q{m.match}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-4" style={{ marginTop: '1.5rem' }}>
                            <div className="flex items-center gap-2">
                                <div style={{ width: '12px', height: '12px', background: 'var(--primary)', borderRadius: '3px' }}></div>
                                <span style={{ fontSize: '10px', fontWeight: 900, color: '#888' }}>TELEOP</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div style={{ width: '12px', height: '12px', background: 'var(--secondary)', borderRadius: '3px' }}></div>
                                <span style={{ fontSize: '10px', fontWeight: 900, color: '#888' }}>AUTO</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Match Data Logs */}
                <section className="reveal" style={{ marginBottom: '4rem' }}>
                    <h2 style={{ fontSize: '11px', fontWeight: 950, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#444', marginBottom: '1.5rem' }}>Match Data Logs</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                        {teamReports.map((r, i) => (
                            <div key={`${r.matchKey}-${i}`} className="glass" style={{ padding: '1.5rem', borderRadius: '25px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
                                    <span style={{ fontSize: '1.25rem', fontWeight: 950, fontStyle: 'italic', color: 'var(--primary)' }}>Q{r.matchKey.split('_qm').pop()}</span>
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ fontSize: '8px', fontWeight: 950, color: '#666' }}>SCOUT: {r.scoutId}</p>
                                        {r.data.mech_failure && <span style={{ fontSize: '8px', fontWeight: 950, color: '#ef4444' }}>● FAILURE</span>}
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.8rem' }}>
                                    <div>
                                        <p style={{ fontSize: '8px', fontWeight: 900, color: '#555', marginBottom: '0.25rem' }}>AUTO</p>
                                        <p style={{ color: '#888' }}>{r.data.auto.moved ? '✓' : '×'} Move | {r.data.auto.fuel_scored || 0} Fuel</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '8px', fontWeight: 900, color: '#555', marginBottom: '0.25rem' }}>TELEOP</p>
                                        <p style={{ color: '#fff', fontWeight: 700 }}>{r.data.teleop.fuel_scored || 0} Fuel | {r.data.teleop.tower_level}</p>
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
