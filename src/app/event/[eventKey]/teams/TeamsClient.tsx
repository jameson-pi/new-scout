'use client';

import { useState } from 'react';
import Link from 'next/link';
import { exportToCSV, ExportableTeam } from '@/lib/export';

interface TeamData {
    teamKey: string;
    teamNum: number;
    name: string;
    ourEPA: number;
    sbEPA: number | null;
    failureRate: number;
    consistencyScore: number;
    riskLevel: 'low' | 'medium' | 'high';
    synergyScore: number;
    role: string;
    strengths: string[];
}

interface TeamsClientProps {
    eventKey: string;
    teams: TeamData[];
}

export default function TeamsClient({ eventKey, teams }: TeamsClientProps) {
    const [sortBy, setSortBy] = useState<'epa' | 'synergy' | 'reliability'>('epa');
    const [showExportModal, setShowExportModal] = useState(false);

    const sortedTeams = [...teams].sort((a, b) => {
        if (sortBy === 'epa') return b.ourEPA - a.ourEPA;
        if (sortBy === 'synergy') return b.synergyScore - a.synergyScore;
        if (sortBy === 'reliability') return a.failureRate - b.failureRate;
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
        setShowExportModal(false);
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
        <main style={{ minHeight: '100vh', background: '#000', color: '#fff', padding: '4rem 2rem' }}>
            <div className="mx-auto" style={{ maxWidth: '1200px' }}>
                <header style={{ marginBottom: '2rem' }}>
                    <Link href={`/event/${eventKey}`} style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', display: 'block', marginBottom: '1rem' }}>
                        ← BACK TO DASHBOARD
                    </Link>
                    <div className="flex justify-between items-end" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <h1 className="text-gradient" style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)', fontWeight: 950, fontStyle: 'italic', letterSpacing: '-0.05em', lineHeight: 1 }}>
                                MISSION TEAMS
                            </h1>
                            <p style={{ color: '#888', fontSize: '1rem', fontWeight: 500 }}>{teams.length} Teams • EPA + Reliability + Synergy Analysis</p>
                        </div>
                        <button
                            onClick={handleExport}
                            style={{
                                background: 'var(--secondary)',
                                color: '#000',
                                border: 'none',
                                padding: '0.75rem 1.5rem',
                                borderRadius: '15px',
                                fontWeight: 950,
                                cursor: 'pointer',
                                fontSize: '0.8rem'
                            }}
                        >
                            📥 EXPORT CSV
                        </button>
                    </div>
                </header>

                {/* Sort Controls */}
                <div className="glass" style={{ padding: '1rem', borderRadius: '20px', marginBottom: '2rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '10px', fontWeight: 900, color: '#888', alignSelf: 'center', marginRight: '1rem' }}>SORT BY:</span>
                    {(['epa', 'synergy', 'reliability'] as const).map(sort => (
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
                            {sort === 'epa' ? '📊 EPA' : sort === 'synergy' ? '🤝 Synergy' : '⚙️ Reliability'}
                        </button>
                    ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                    {sortedTeams.map((t, i) => {
                        const diff = t.sbEPA != null ? (t.ourEPA - t.sbEPA).toFixed(1) : '0.0';
                        const diffColor = parseFloat(diff) > 0 ? '#22c55e' : parseFloat(diff) < 0 ? '#ef4444' : '#888';

                        return (
                            <Link key={t.teamKey} href={`/event/${eventKey}/team/${t.teamKey}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                <div className="glass" style={{ padding: '2rem', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
                                    {/* Rank Badge */}
                                    <div style={{ position: 'absolute', top: '-10px', left: '20px', background: 'var(--primary)', color: '#000', padding: '0.25rem 0.75rem', borderRadius: '20px', fontWeight: 950, fontSize: '0.75rem' }}>
                                        #{i + 1}
                                    </div>

                                    {/* Role Badge */}
                                    <div style={{ position: 'absolute', top: '15px', right: '15px', background: getRoleBadge(t.role), color: '#fff', padding: '0.25rem 0.5rem', borderRadius: '8px', fontSize: '8px', fontWeight: 900, textTransform: 'uppercase' }}>
                                        {t.role.replace('_', ' ')}
                                    </div>

                                    <div style={{ marginTop: '0.5rem', marginBottom: '1.5rem' }}>
                                        <p style={{ fontSize: '11px', fontWeight: 950, color: 'var(--primary)', letterSpacing: '0.15em' }}>{t.teamNum}</p>
                                        <h3 style={{ fontSize: '1.5rem', fontWeight: 950, fontStyle: 'italic', textTransform: 'uppercase', color: '#fff', lineHeight: 1.1 }}>{t.name}</h3>
                                    </div>

                                    {/* Stats Grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                                        <div>
                                            <p style={{ fontSize: '9px', fontWeight: 900, color: '#888', textTransform: 'uppercase' }}>Our EPA</p>
                                            <p style={{ fontSize: '1.5rem', fontWeight: 950, color: '#fff' }}>{t.ourEPA.toFixed(1)}</p>
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '9px', fontWeight: 900, color: '#888', textTransform: 'uppercase' }}>SB EPA</p>
                                            <p style={{ fontSize: '1.5rem', fontWeight: 950, color: '#aaa' }}>{t.sbEPA?.toFixed(1) || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '9px', fontWeight: 900, color: '#888', textTransform: 'uppercase' }}>Synergy</p>
                                            <p style={{ fontSize: '1.5rem', fontWeight: 950, color: 'var(--secondary)' }}>{t.synergyScore.toFixed(0)}</p>
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
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </main>
    );
}
