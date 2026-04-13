'use client';

import { useState, memo, useMemo } from 'react';
import Link from 'next/link';
import { exportToCSV, ExportableTeam, exportAllTeamsToCSV, exportAllTeamsToJSON, exportAllTeamsToTextReport, exportObjectToJSON } from '@/lib/export';
import { exportAllTeamsAction } from '@/lib/actions';

interface TeamData {
    teamKey: string;
    teamNum: number;
    name: string;
    ourEPA: number;
    sbEPA: number | null;
    matchesScouted: number;
    failureRate: number;
    consistencyScore: number;
    riskLevel: 'low' | 'medium' | 'high';
    synergyScore: number;
    role: string;
    strengths: string[];
    allNotes?: string[];
    hasPit?: boolean;
}

interface TeamsClientProps {
    eventKey: string;
    teams: TeamData[];
}

export default function TeamsClient({ eventKey, teams }: TeamsClientProps) {
    const [sortBy, setSortBy] = useState<'epa' | 'synergy' | 'reliability' | 'number'>('epa');
    const [showUnscouted, setShowUnscouted] = useState(true);
    const [exportAllLoading, setExportAllLoading] = useState<null | 'csv' | 'json' | 'txt' | 'bundle'>(null);

    const filteredTeams = showUnscouted ? teams : teams.filter(t => t.matchesScouted > 0);

    const sortedTeams = [...filteredTeams].sort((a, b) => {
        if (sortBy === 'epa') return b.ourEPA - a.ourEPA;
        if (sortBy === 'synergy') return b.synergyScore - a.synergyScore;
        if (sortBy === 'reliability') return a.failureRate - b.failureRate;
        if (sortBy === 'number') return a.teamNum - b.teamNum;
        return 0;
    });

    const handleExport = () => {
        const exportData: ExportableTeam[] = sortedTeams.map((t, i) => ({
            rank: i + 1,
            teamNumber: t.teamNum.toString(),
            teamName: t.name,
            ourEPA: t.ourEPA,
            sbEPA: t.sbEPA,
            failureRate: t.failureRate,
            consistencyScore: t.consistencyScore,
            notes: t.strengths.join(', ')
        }));
        exportToCSV(exportData, `${eventKey}_teams`);
    };

    const handleExportAll = async (format: 'csv' | 'json' | 'txt') => {
        setExportAllLoading(format);
        try {
            const data = await exportAllTeamsAction(eventKey);
            if (format === 'csv') exportAllTeamsToCSV(data, eventKey);
            else if (format === 'json') exportAllTeamsToJSON(data, eventKey);
            else exportAllTeamsToTextReport(data, eventKey);
        } catch (e) {
            console.error('Export all failed:', e);
            alert('Export failed — check console for details.');
        } finally {
            setExportAllLoading(null);
        }
    };

    const handleExportBundle = async () => {
        setExportAllLoading('bundle');
        try {
            const response = await fetch(`/api/event/${eventKey}/export-all`, { cache: 'no-store' });
            if (!response.ok) {
                console.error(`Export bundle failed: ${response.status}`);
                alert('Full bundle export failed — check console for details.');
                return;
            }
            const bundle = await response.json();
            exportObjectToJSON(bundle, `${eventKey}_full_export_bundle`);
        } catch (e) {
            console.error('Export bundle failed:', e);
            alert('Full bundle export failed — check console for details.');
        } finally {
            setExportAllLoading(null);
        }
    };

    const getRiskColor = (risk: string) => {
        if (risk === 'low') return '#22c55e';
        if (risk === 'medium') return '#eab308';
        return '#ef4444';
    };

    const getRoleBadge = (role: string) => {
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
        <main className="responsive-padding" style={{ minHeight: '100vh', background: '#000', color: '#fff', padding: '4rem 2rem' }}>
            <div className="mx-auto" style={{ maxWidth: '1200px' }}>
                <header style={{ marginBottom: '2.5rem' }}>
                    <Link href={`/event/${eventKey}`} style={{ color: 'var(--primary-teal)', textDecoration: 'none', fontSize: '11px', fontWeight: 950, letterSpacing: '0.2em', textTransform: 'uppercase', display: 'block', marginBottom: '1rem' }}>
                        ← BACK
                    </Link>
                    <div className="flex justify-between items-end responsive-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <h1 style={{ fontSize: 'clamp(2.8rem, 8vw, 5rem)', fontWeight: 950, fontStyle: 'italic', letterSpacing: '-0.03em', lineHeight: 1, background: 'linear-gradient(135deg, var(--primary-teal) 0%, var(--primary-brown) 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent' }}>
                                MISSION TEAMS
                            </h1>
                            <p style={{ color: '#aaa', fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.05em', marginTop: '0.75rem' }}>
                                <span style={{ color: 'var(--primary-teal)', fontWeight: 950 }}>{teams.length}</span> Teams &nbsp;·&nbsp;
                                <span style={{ color: 'var(--secondary-blue)', fontWeight: 950 }}>{teams.filter(t => t.matchesScouted > 0).length} scouted</span>
                                &nbsp;·&nbsp; <span style={{ color: 'var(--primary-brown)' }}>EPA · Reliability · Synergy</span>
                            </p>
                        </div>
                        <div className="export-actions" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-end' }}>
                            {/* Quick export (current view) */}
                            <button
                                onClick={handleExport}
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    color: '#aaa',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    padding: '0.5rem 1rem',
                                    borderRadius: '10px',
                                    fontWeight: 900,
                                    cursor: 'pointer',
                                    fontSize: '0.75rem',
                                    letterSpacing: '0.05em',
                                }}
                            >
                                📊 QUICK CSV (current view)
                            </button>

                            {/* Export All group */}
                            <div className="export-group" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <span style={{ fontSize: '9px', fontWeight: 900, color: '#555', textTransform: 'uppercase', marginRight: '0.25rem' }}>Export All:</span>
                                {([
                                    { fmt: 'csv' as const, label: '📥 CSV', color: '#22c55e' },
                                    { fmt: 'json' as const, label: '{ } JSON', color: '#3b82f6' },
                                    { fmt: 'txt' as const, label: '📄 Report', color: '#a855f7' },
                                ] as const).map(({ fmt, label, color }) => (
                                    <button
                                        key={fmt}
                                        onClick={() => handleExportAll(fmt)}
                                        disabled={exportAllLoading !== null}
                                        style={{
                                            background: exportAllLoading === fmt
                                                ? `rgba(${fmt === 'csv' ? '34,197,94' : fmt === 'json' ? '59,130,246' : '168,85,247'},0.15)`
                                                : 'rgba(255,255,255,0.03)',
                                            color: exportAllLoading === fmt ? color : '#888',
                                            border: `1px solid ${exportAllLoading === fmt ? color : 'rgba(255,255,255,0.08)'}`,
                                            padding: '0.6rem 1.1rem',
                                            borderRadius: '12px',
                                            fontWeight: 950,
                                            cursor: exportAllLoading !== null ? 'not-allowed' : 'pointer',
                                            fontSize: '0.75rem',
                                            letterSpacing: '0.05em',
                                            transition: 'all 0.2s',
                                            opacity: exportAllLoading !== null && exportAllLoading !== fmt ? 0.4 : 1,
                                        }}
                                    >
                                        {exportAllLoading === fmt ? '⏳ Loading…' : label}
                                    </button>
                                ))}
                                <button
                                    onClick={handleExportBundle}
                                    disabled={exportAllLoading !== null}
                                    style={{
                                        background: exportAllLoading === 'bundle' ? 'rgba(245, 158, 11, 0.16)' : 'rgba(255,255,255,0.03)',
                                        color: exportAllLoading === 'bundle' ? '#f59e0b' : '#999',
                                        border: `1px solid ${exportAllLoading === 'bundle' ? '#f59e0b' : 'rgba(255,255,255,0.08)'}`,
                                        padding: '0.6rem 1.1rem',
                                        borderRadius: '12px',
                                        fontWeight: 950,
                                        cursor: exportAllLoading !== null ? 'not-allowed' : 'pointer',
                                        fontSize: '0.75rem',
                                        letterSpacing: '0.05em',
                                        transition: 'all 0.2s',
                                        opacity: exportAllLoading !== null && exportAllLoading !== 'bundle' ? 0.4 : 1,
                                    }}
                                >
                                    {exportAllLoading === 'bundle' ? '⏳ Loading…' : '🧩 FULL BUNDLE'}
                                </button>
                            </div>
                            <p style={{ fontSize: '9px', color: '#444', fontWeight: 700 }}>
                                CSV = Excel-ready · JSON = raw teams · Report = readable .txt · Bundle = everything
                            </p>
                        </div>
                    </div>
                </header>

                {/* Controls */}
                <div className="glass" style={{ padding: '1rem', borderRadius: '20px', marginBottom: '2rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', fontWeight: 900, color: '#888', marginRight: '0.5rem' }}>SORT:</span>
                    {(['epa', 'synergy', 'reliability', 'number'] as const).map(sort => (
                        <button
                            key={sort}
                            onClick={() => setSortBy(sort)}
                            style={{
                                background: sortBy === sort ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                color: sortBy === sort ? '#000' : '#fff',
                                border: 'none',
                                padding: '0.5rem 1rem',
                                borderRadius: '10px',
                                fontWeight: 900,
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                textTransform: 'uppercase'
                            }}
                        >
                            {sort === 'epa' ? '📊 EPA' : sort === 'synergy' ? '🤝 Synergy' : sort === 'reliability' ? '⚙️ Reliability' : '#️⃣ Number'}
                        </button>
                    ))}
                    <div style={{ marginLeft: 'auto' }}>
                        <button
                            onClick={() => setShowUnscouted(v => !v)}
                            style={{
                                background: showUnscouted ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.05)',
                                color: showUnscouted ? '#a855f7' : '#666',
                                border: `1px solid ${showUnscouted ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.1)'}`,
                                padding: '0.5rem 1rem',
                                borderRadius: '10px',
                                fontWeight: 900,
                                fontSize: '0.75rem',
                                cursor: 'pointer'
                            }}
                        >
                            {showUnscouted ? '👁 ALL TEAMS' : '🔍 SCOUTED ONLY'}
                        </button>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                    {sortedTeams.map((t, i) => {
                        const unscouted = t.matchesScouted === 0;
                        return (
                            <Link key={t.teamKey} href={`/event/${eventKey}/team/${t.teamKey}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                <div className="glass" style={{ padding: '2rem', borderRadius: '30px', border: `1px solid ${unscouted ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.07)'}`, position: 'relative', opacity: unscouted ? 0.65 : 1 }}>
                                    {/* Rank Badge */}
                                    <div style={{ position: 'absolute', top: '-10px', left: '20px', background: unscouted ? '#333' : 'var(--primary)', color: unscouted ? '#888' : '#000', padding: '0.25rem 0.75rem', borderRadius: '20px', fontWeight: 950, fontSize: '0.75rem' }}>
                                        #{i + 1}
                                    </div>

                                    {/* Unscouted badge OR Role badge */}
                                    <div style={{ position: 'absolute', top: '15px', right: '15px', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                        {t.hasPit && <span style={{ background: 'rgba(168,85,247,0.2)', color: '#a855f7', padding: '0.2rem 0.4rem', borderRadius: '6px', fontSize: '8px', fontWeight: 900 }}>PIT ✓</span>}
                                        <span style={{ background: unscouted ? 'rgba(255,255,255,0.05)' : getRoleBadge(t.role), color: unscouted ? '#555' : '#fff', padding: '0.25rem 0.5rem', borderRadius: '8px', fontSize: '8px', fontWeight: 900, textTransform: 'uppercase' }}>
                                            {unscouted ? 'NOT YET SCOUTED' : t.role.replace('_', ' ')}
                                        </span>
                                    </div>

                                    <div style={{ marginTop: '0.5rem', marginBottom: '1.5rem' }}>
                                        <p style={{ fontSize: '11px', fontWeight: 950, color: unscouted ? '#555' : 'var(--primary)', letterSpacing: '0.15em' }}>{t.teamNum}</p>
                                        <h3 style={{ fontSize: '1.5rem', fontWeight: 950, fontStyle: 'italic', textTransform: 'uppercase', color: unscouted ? '#666' : '#fff', lineHeight: 1.1 }}>{t.name}</h3>
                                    </div>

                                    {unscouted ? (
                                        /* Pre-event: show Statbotics EPA if available */
                                        <div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                <div>
                                                    <p style={{ fontSize: '9px', fontWeight: 900, color: '#555', textTransform: 'uppercase' }}>Statbotics EPA</p>
                                                    <p style={{ fontSize: '1.5rem', fontWeight: 950, color: '#888' }}>{t.sbEPA?.toFixed(1) ?? '—'}</p>
                                                </div>
                                                <div>
                                                    <p style={{ fontSize: '9px', fontWeight: 900, color: '#555', textTransform: 'uppercase' }}>Matches Scouted</p>
                                                    <p style={{ fontSize: '1.5rem', fontWeight: 950, color: '#555' }}>0</p>
                                                </div>
                                            </div>
                                            {t.allNotes && t.allNotes.length > 0 && (
                                                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <p style={{ fontSize: '8px', fontWeight: 900, color: '#555', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Pit Notes</p>
                                                    <p style={{ fontSize: '0.75rem', color: '#666', lineHeight: 1.4, fontStyle: 'italic' }}>
                                                        &ldquo;{t.allNotes[0].substring(0, 80)}{t.allNotes[0].length > 80 ? '...' : ''}&rdquo;
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            {/* Stats Grid */}
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                                                <div>
                                                    <p style={{ fontSize: '9px', fontWeight: 900, color: '#888', textTransform: 'uppercase' }}>Our EPA</p>
                                                    <p style={{ fontSize: '1.5rem', fontWeight: 950, color: '#fff' }}>{t.ourEPA.toFixed(1)}</p>
                                                </div>
                                                <div>
                                                    <p style={{ fontSize: '9px', fontWeight: 900, color: '#888', textTransform: 'uppercase' }}>SB EPA</p>
                                                    <p style={{ fontSize: '1.5rem', fontWeight: 950, color: '#aaa' }}>{t.sbEPA?.toFixed(1) ?? 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p style={{ fontSize: '9px', fontWeight: 900, color: '#888', textTransform: 'uppercase' }}>Scouted</p>
                                                    <p style={{ fontSize: '1.5rem', fontWeight: 950, color: 'var(--secondary)' }}>{t.matchesScouted}</p>
                                                </div>
                                            </div>

                                            {/* Reliability Bar */}
                                            <div style={{ marginBottom: '1rem' }}>
                                                <div className="flex justify-between" style={{ marginBottom: '0.25rem' }}>
                                                    <span style={{ fontSize: '9px', fontWeight: 900, color: '#888', textTransform: 'uppercase' }}>Reliability</span>
                                                    <span style={{ fontSize: '9px', fontWeight: 900, color: getRiskColor(t.riskLevel) }}>{t.riskLevel.toUpperCase()} RISK</span>
                                                </div>
                                                <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px' }}>
                                                    <div style={{ height: '100%', width: `${100 - t.failureRate * 100}%`, background: getRiskColor(t.riskLevel), borderRadius: '3px' }}></div>
                                                </div>
                                            </div>

                                            {/* Strengths */}
                                            {t.strengths.length > 0 && (
                                                <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                                                    {t.strengths.map(s => (
                                                        <span key={s} style={{ fontSize: '9px', fontWeight: 900, background: 'rgba(255,255,255,0.05)', padding: '0.25rem 0.5rem', borderRadius: '5px', color: '#aaa' }}>{s}</span>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Latest note preview */}
                                            {t.allNotes && t.allNotes.length > 0 && (
                                                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <p style={{ fontSize: '8px', fontWeight: 900, color: '#444', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                                                        Latest Intel {t.allNotes.length > 1 ? `(+${t.allNotes.length - 1} more)` : ''}
                                                    </p>
                                                    <p style={{ fontSize: '0.75rem', color: '#777', lineHeight: 1.4, fontStyle: 'italic' }}>
                                                        &ldquo;{t.allNotes[0].substring(0, 80)}{t.allNotes[0].length > 80 ? '...' : ''}&rdquo;
                                                    </p>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </main>
    );
}
