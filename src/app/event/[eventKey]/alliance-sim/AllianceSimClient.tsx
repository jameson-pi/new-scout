'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

interface TeamData {
    teamKey: string;
    name: string;
    role: string;
    strengths: string[];
    avgFuel: number;
    avgTowerPts: number;
    towerRate: number;
    defenseRating: number;
    synergyScore: number;
}

interface AllianceSimClientProps {
    eventKey: string;
    teams: TeamData[];
}

export default function AllianceSimClient({ eventKey, teams }: AllianceSimClientProps) {
    const [alliance, setAlliance] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredTeams = useMemo(() => {
        return teams.filter(t =>
            !alliance.includes(t.teamKey) &&
            (t.teamKey.includes(searchTerm) || t.name.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [teams, alliance, searchTerm]);

    const allianceTeams = useMemo(() => {
        return alliance.map(tk => teams.find(t => t.teamKey === tk)).filter(Boolean) as TeamData[];
    }, [alliance, teams]);

    const simResults = useMemo(() => {
        if (allianceTeams.length < 3) return null;

        const totalFuel = allianceTeams.reduce((acc, t) => acc + t.avgFuel, 0);
        const totalTowerPts = allianceTeams.reduce((acc, t) => acc + t.avgTowerPts, 0);
        const totalSynergy = allianceTeams.reduce((acc, t) => acc + t.synergyScore, 0);
        const avgTower = allianceTeams.reduce((acc, t) => acc + t.towerRate, 0) / 3;

        const roles = allianceTeams.map(t => t.role);
        const uniqueRoles = new Set(roles).size;
        const roleBalance = (uniqueRoles / 3) * 100;

        const allStrengths = allianceTeams.flatMap(t => t.strengths);
        const uniqueStrengths = new Set(allStrengths).size;
        const strengthCoverage = Math.min(100, uniqueStrengths * 25);

        const energizedRP = totalFuel >= 100 ? 1 : 0;
        const superchargedRP = totalFuel >= 360 ? 1 : 0;
        const traversalRP = totalTowerPts >= 50 ? 1 : 0;
        const winBonus = totalSynergy >= 150 ? 2 : 1;

        return {
            totalFuel: totalFuel.toFixed(1),
            totalTowerPts: totalTowerPts.toFixed(1),
            totalSynergy: totalSynergy.toFixed(0),
            avgTower: avgTower.toFixed(0),
            roleBalance: roleBalance.toFixed(0),
            strengthCoverage: strengthCoverage.toFixed(0),
            predictedRPs: (energizedRP + superchargedRP + traversalRP + winBonus).toFixed(1),
            winRate: Math.min(95, 40 + totalSynergy * 0.3).toFixed(0)
        };
    }, [allianceTeams]);

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
        <main className="responsive-padding" style={{ minHeight: '100vh', background: '#000', color: '#fff', padding: '4rem 2rem' }}>
            <div className="mx-auto" style={{ maxWidth: '1100px' }}>
                <header style={{ marginBottom: '2rem' }}>
                    <Link href={`/event/${eventKey}`} style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', display: 'block', marginBottom: '1rem' }}>
                        ← BACK TO DASHBOARD
                    </Link>
                    <h1 className="text-gradient" style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)', fontWeight: 950, fontStyle: 'italic' }}>
                        ALLIANCE SIMULATOR
                    </h1>
                    <p style={{ color: '#888', fontSize: '1rem' }}>Build your dream alliance and analyze synergy</p>
                </header>

                <div className="side-by-side-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
                    {/* Left: Alliance Builder */}
                    <div>
                        <div className="glass" style={{ padding: '2rem', borderRadius: '30px', marginBottom: '2rem' }}>
                            <h3 style={{ fontSize: '10px', fontWeight: 950, color: '#888', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '1.5rem' }}>
                                YOUR ALLIANCE
                            </h3>

                            <div className="responsive-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                                {[0, 1, 2].map(i => {
                                    const team = allianceTeams[i];
                                    return (
                                        <div
                                            key={i}
                                            style={{
                                                height: '140px',
                                                background: team ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, transparent 100%)' : 'rgba(255,255,255,0.02)',
                                                borderRadius: '20px',
                                                border: team ? '2px solid var(--primary)' : '2px dashed rgba(255,255,255,0.1)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.5rem',
                                                padding: '1rem'
                                            }}
                                        >
                                            {team ? (
                                                <>
                                                    <span style={{ fontSize: '1.75rem', fontWeight: 950, color: 'var(--primary)' }}>
                                                        {team.teamKey.replace('frc', '')}
                                                    </span>
                                                    <span style={{ fontSize: '0.7rem', color: '#aaa', textAlign: 'center' }}>{team.name}</span>
                                                    <span style={{ fontSize: '8px', fontWeight: 900, background: getRoleBadgeColor(team.role), padding: '0.2rem 0.5rem', borderRadius: '5px', textTransform: 'uppercase' }}>
                                                        {team.role.replace('_', ' ')}
                                                    </span>
                                                    <button
                                                        onClick={() => setAlliance(alliance.filter(a => a !== team.teamKey))}
                                                        style={{ background: 'rgba(239, 68, 68, 0.2)', border: 'none', color: '#ef4444', padding: '0.25rem 0.75rem', borderRadius: '10px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 900, marginTop: '0.25rem' }}
                                                    >
                                                        REMOVE
                                                    </button>
                                                </>
                                            ) : (
                                                <span style={{ color: '#444', fontSize: '0.9rem', fontWeight: 600 }}>Robot {i + 1}</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Search */}
                            <input
                                type="text"
                                placeholder="Search teams..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    width: '100%',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '15px',
                                    padding: '1rem',
                                    color: '#fff',
                                    fontSize: '1rem',
                                    marginBottom: '1rem'
                                }}
                            />

                            {/* Available Teams */}
                            <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'grid', gap: '0.5rem' }}>
                                {filteredTeams.slice(0, 20).map(t => (
                                    <button
                                        key={t.teamKey}
                                        onClick={() => alliance.length < 3 && setAlliance([...alliance, t.teamKey])}
                                        disabled={alliance.length >= 3}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '0.75rem 1rem',
                                            background: 'rgba(255,255,255,0.02)',
                                            border: '1px solid rgba(255,255,255,0.05)',
                                            borderRadius: '10px',
                                            color: '#fff',
                                            cursor: alliance.length < 3 ? 'pointer' : 'not-allowed',
                                            opacity: alliance.length >= 3 ? 0.5 : 1
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <span style={{ fontWeight: 950, color: 'var(--primary)' }}>{t.teamKey.replace('frc', '')}</span>
                                            <span style={{ fontSize: '0.8rem', color: '#888' }}>{t.name}</span>
                                        </div>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--secondary)' }}>+{t.synergyScore.toFixed(0)}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right: Results */}
                    <div>
                        {simResults ? (
                            <div className="glass" style={{ padding: '2rem', borderRadius: '30px', borderTop: '4px solid var(--secondary)' }}>
                                <h3 style={{ fontSize: '10px', fontWeight: 950, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '1.5rem' }}>
                                    SIMULATION RESULTS
                                </h3>

                                <div style={{ display: 'grid', gap: '1.5rem' }}>
                                    <div style={{ textAlign: 'center', padding: '1.5rem', background: 'rgba(57, 255, 20, 0.05)', borderRadius: '20px' }}>
                                        <p style={{ fontSize: '10px', fontWeight: 900, color: '#888', textTransform: 'uppercase' }}>Predicted RPs / Match</p>
                                        <p style={{ fontSize: '3rem', fontWeight: 950, color: 'var(--secondary)' }}>{simResults.predictedRPs}</p>
                                    </div>

                                    <div className="responsive-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div style={{ textAlign: 'center' }}>
                                            <p style={{ fontSize: '9px', fontWeight: 900, color: '#888', textTransform: 'uppercase' }}>Win Rate</p>
                                            <p style={{ fontSize: '2rem', fontWeight: 950, color: '#fff' }}>{simResults.winRate}%</p>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <p style={{ fontSize: '9px', fontWeight: 900, color: '#888', textTransform: 'uppercase' }}>Synergy</p>
                                            <p style={{ fontSize: '2rem', fontWeight: 950, color: 'var(--primary)' }}>{simResults.totalSynergy}</p>
                                        </div>
                                    </div>

                                    <div className="responsive-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div style={{ textAlign: 'center' }}>
                                            <p style={{ fontSize: '9px', fontWeight: 900, color: '#888', textTransform: 'uppercase' }}>Role Balance</p>
                                            <p style={{ fontSize: '1.5rem', fontWeight: 950, color: '#fff' }}>{simResults.roleBalance}%</p>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <p style={{ fontSize: '9px', fontWeight: 900, color: '#888', textTransform: 'uppercase' }}>Coverage</p>
                                            <p style={{ fontSize: '1.5rem', fontWeight: 950, color: '#fff' }}>{simResults.strengthCoverage}%</p>
                                        </div>
                                    </div>

                                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                                        <p style={{ fontSize: '9px', fontWeight: 900, color: '#888', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Scoring Potential</p>
                                        <div className="responsive-grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                                            <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '10px' }}>
                                                <p style={{ fontSize: '1rem', fontWeight: 950, color: '#a855f7' }}>{simResults.totalFuel}</p>
                                                <p style={{ fontSize: '8px', color: '#666' }}>Fuel/Match</p>
                                            </div>
                                            <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '10px' }}>
                                                <p style={{ fontSize: '1rem', fontWeight: 950, color: '#3b82f6' }}>{simResults.totalTowerPts}</p>
                                                <p style={{ fontSize: '8px', color: '#666' }}>Tower Pts/Match</p>
                                            </div>
                                            <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '10px' }}>
                                                <p style={{ fontSize: '1rem', fontWeight: 950, color: '#22c55e' }}>{simResults.avgTower}%</p>
                                                <p style={{ fontSize: '8px', color: '#666' }}>Tower Rate</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="glass" style={{ padding: '2rem', borderRadius: '30px', textAlign: 'center' }}>
                                <p style={{ color: '#666', fontSize: '1rem' }}>Select 3 teams to see alliance analysis</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
