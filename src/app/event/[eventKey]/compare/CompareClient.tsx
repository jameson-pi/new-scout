'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

interface TeamData {
    teamKey: string;
    teamNum: number;
    name: string;
    ourEPA: number;
    sbEPA: number | null;
    avgFuel: number;
    avgTowerPts: number;
    towerRate: number;
    avgDefense: number;
    consistencyScore: number;
    synergyScore: number;
}

interface CompareClientProps {
    eventKey: string;
    teams: TeamData[];
}

export default function CompareClient({ eventKey, teams }: CompareClientProps) {
    const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredTeams = useMemo(() => {
        return teams.filter(t =>
            !selectedTeams.includes(t.teamKey) &&
            (t.teamKey.includes(searchTerm) || t.name.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [teams, selectedTeams, searchTerm]);

    const comparedTeams = useMemo(() => {
        return selectedTeams.map(tk => teams.find(t => t.teamKey === tk)).filter(Boolean) as TeamData[];
    }, [selectedTeams, teams]);

    // Get max values for scaling bars
    const maxValues = useMemo(() => {
        const all = teams;
        return {
            epa: Math.max(...all.map(t => t.ourEPA)),
            fuel: Math.max(...all.map(t => t.avgFuel)),
            tower: Math.max(...all.map(t => t.avgTowerPts)),
            defense: 5,
            towerRate: 100,
            consistency: 100
        };
    }, [teams]);

    const metrics = [
        { key: 'ourEPA', label: 'EPA', max: maxValues.epa, format: (v: number) => v.toFixed(1), color: 'var(--primary)' },
        { key: 'avgFuel', label: 'Avg Fuel', max: maxValues.fuel, format: (v: number) => v.toFixed(1), color: '#a855f7' },
        { key: 'avgTowerPts', label: 'Avg Tower Pts', max: maxValues.tower, format: (v: number) => v.toFixed(1), color: '#3b82f6' },
        { key: 'towerRate', label: 'Tower %', max: 100, format: (v: number) => v.toFixed(0) + '%', color: '#22c55e' },
        { key: 'avgDefense', label: 'Defense', max: 5, format: (v: number) => v.toFixed(1), color: '#ef4444' },
        { key: 'consistencyScore', label: 'Consistency', max: 100, format: (v: number) => v.toFixed(0), color: '#eab308' },
    ];

    return (
        <main style={{ minHeight: '100vh', background: '#000', color: '#fff', padding: '4rem 2rem' }}>
            <div className="mx-auto" style={{ maxWidth: '1200px' }}>
                <header style={{ marginBottom: '2rem' }}>
                    <Link href={`/event/${eventKey}`} style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', display: 'block', marginBottom: '1rem' }}>
                        ← BACK TO DASHBOARD
                    </Link>
                    <h1 className="text-gradient" style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)', fontWeight: 950, fontStyle: 'italic' }}>
                        TEAM COMPARISON
                    </h1>
                    <p style={{ color: '#888', fontSize: '1rem' }}>Side-by-side analysis • Select up to 3 teams</p>
                </header>

                {/* Team Selection */}
                <div className="glass" style={{ padding: '1.5rem', borderRadius: '25px', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <input
                            type="text"
                            placeholder="Search teams..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '10px',
                                padding: '0.75rem 1rem',
                                color: '#fff',
                                fontSize: '1rem',
                                minWidth: '200px'
                            }}
                        />
                        {selectedTeams.map(tk => {
                            const t = teams.find(t => t.teamKey === tk);
                            return (
                                <div
                                    key={tk}
                                    style={{
                                        background: 'var(--primary)',
                                        color: '#000',
                                        padding: '0.5rem 1rem',
                                        borderRadius: '20px',
                                        fontWeight: 950,
                                        fontSize: '0.9rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}
                                >
                                    {t?.teamNum}
                                    <button
                                        onClick={() => setSelectedTeams(selectedTeams.filter(s => s !== tk))}
                                        style={{ background: 'none', border: 'none', color: '#000', cursor: 'pointer', fontWeight: 900 }}
                                    >
                                        ×
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Dropdown */}
                    {searchTerm && filteredTeams.length > 0 && selectedTeams.length < 3 && (
                        <div style={{ marginTop: '1rem', display: 'grid', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                            {filteredTeams.slice(0, 10).map(t => (
                                <button
                                    key={t.teamKey}
                                    onClick={() => {
                                        setSelectedTeams([...selectedTeams, t.teamKey]);
                                        setSearchTerm('');
                                    }}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        padding: '0.75rem 1rem',
                                        background: 'rgba(255,255,255,0.02)',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        borderRadius: '10px',
                                        color: '#fff',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <span><b style={{ color: 'var(--primary)' }}>{t.teamNum}</b> {t.name}</span>
                                    <span style={{ color: 'var(--secondary)' }}>EPA: {t.ourEPA.toFixed(1)}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Comparison View */}
                {comparedTeams.length >= 2 && (
                    <div className="glass" style={{ padding: '2rem', borderRadius: '30px' }}>
                        <h3 style={{ fontSize: '11px', fontWeight: 950, color: 'var(--primary)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '2rem' }}>
                            CAPABILITY COMPARISON
                        </h3>

                        {/* Team Headers */}
                        <div style={{ display: 'grid', gridTemplateColumns: `150px repeat(${comparedTeams.length}, 1fr)`, gap: '1rem', marginBottom: '2rem' }}>
                            <div></div>
                            {comparedTeams.map(t => (
                                <div key={t.teamKey} style={{ textAlign: 'center' }}>
                                    <p style={{ fontSize: '2rem', fontWeight: 950, color: 'var(--primary)' }}>{t.teamNum}</p>
                                    <p style={{ fontSize: '0.8rem', color: '#888' }}>{t.name}</p>
                                </div>
                            ))}
                        </div>

                        {/* Metrics */}
                        {metrics.map(m => (
                            <div key={m.key} style={{ display: 'grid', gridTemplateColumns: `150px repeat(${comparedTeams.length}, 1fr)`, gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
                                <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#888' }}>{m.label}</div>
                                {comparedTeams.map(t => {
                                    const value = (t as any)[m.key];
                                    const pct = (value / m.max) * 100;
                                    const isWinner = Math.max(...comparedTeams.map(ct => (ct as any)[m.key])) === value;
                                    return (
                                        <div key={t.teamKey}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                                <span style={{ fontSize: '1.25rem', fontWeight: 950, color: isWinner ? m.color : '#fff' }}>
                                                    {m.format(value)}
                                                </span>
                                                {isWinner && <span style={{ fontSize: '0.7rem', background: m.color, color: '#000', padding: '0.1rem 0.3rem', borderRadius: '5px', fontWeight: 900 }}>BEST</span>}
                                            </div>
                                            <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                                                <div style={{ height: '100%', width: `${pct}%`, background: m.color, borderRadius: '4px', transition: 'width 0.3s ease' }}></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                )}

                {comparedTeams.length < 2 && (
                    <div className="glass" style={{ padding: '4rem', borderRadius: '30px', textAlign: 'center' }}>
                        <p style={{ color: '#666', fontSize: '1.25rem' }}>Select at least 2 teams to compare</p>
                    </div>
                )}
            </div>
        </main>
    );
}
