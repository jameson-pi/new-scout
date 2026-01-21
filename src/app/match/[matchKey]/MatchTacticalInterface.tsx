'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getTacticalStrategy } from '@/lib/actions';
import ReactMarkdown from 'react-markdown';

interface TeamProfile {
    teamKey: string;
    teamNum: string;
    avgL4: string;
    autoMobility: string;
    maxAlgae: number;
    climbRate: string;
    avgDefense: string;
    failures: number;
    notes: string;
}

interface Props {
    matchKey: string;
    eventKey: string;
    redProfiles: TeamProfile[];
    blueProfiles: TeamProfile[];
}

export default function MatchTacticalInterface({ matchKey, eventKey, redProfiles, blueProfiles }: Props) {
    const [selectedAlliance, setSelectedAlliance] = useState<'red' | 'blue'>('red');
    const [manualNotes, setManualNotes] = useState<Record<string, string>>({});
    const [briefing, setBriefing] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const activeProfiles = selectedAlliance === 'red' ? redProfiles : blueProfiles;
    const opponentProfiles = selectedAlliance === 'red' ? blueProfiles : redProfiles;

    const handleGenerate = async () => {
        setIsLoading(true);
        setBriefing(null);

        // Inject manual overrides into profiles
        const updatedAllianceData = activeProfiles.map(p => ({
            ...p,
            notes: manualNotes[p.teamKey] ? `${p.notes} [OVERRIDE: ${manualNotes[p.teamKey]}]` : p.notes
        }));

        const result = await getTacticalStrategy(matchKey, selectedAlliance, updatedAllianceData, opponentProfiles);
        setBriefing(result);
        setIsLoading(false);
    };

    return (
        <div style={{ display: 'grid', gap: '3rem' }}>

            {/* Alliance Control Center */}
            <section className="reveal delay-1">
                <div className="glass" style={{ padding: '2rem', borderRadius: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <p style={{ fontSize: '10px', fontWeight: 950, color: '#444', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '0.5rem' }}>Tactical Focus</p>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 950, fontStyle: 'italic', textTransform: 'uppercase' }}>Alliance Selection</h2>
                    </div>
                    <div className="flex gap-4" style={{ background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '100px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <button
                            onClick={() => setSelectedAlliance('red')}
                            style={{
                                padding: '0.75rem 2rem',
                                borderRadius: '100px',
                                border: 'none',
                                background: selectedAlliance === 'red' ? '#ef4444' : 'transparent',
                                color: selectedAlliance === 'red' ? '#fff' : '#444',
                                fontWeight: 950,
                                fontSize: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            RED ALLIANCE
                        </button>
                        <button
                            onClick={() => setSelectedAlliance('blue')}
                            style={{
                                padding: '0.75rem 2rem',
                                borderRadius: '100px',
                                border: 'none',
                                background: selectedAlliance === 'blue' ? '#3b82f6' : 'transparent',
                                color: selectedAlliance === 'blue' ? '#fff' : '#444',
                                fontWeight: 950,
                                fontSize: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            BLUE ALLIANCE
                        </button>
                    </div>
                </div>
            </section>

            {/* Team Scoring Dashboard */}
            <section className="reveal delay-2">
                <div className="flex items-center gap-4" style={{ marginBottom: '2rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: selectedAlliance === 'red' ? '#ef4444' : '#3b82f6', boxShadow: `0 0 10px ${selectedAlliance === 'red' ? '#ef4444' : '#3b82f6'}` }}></div>
                    <h3 style={{ fontSize: '11px', fontWeight: 950, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#444' }}>Allied Unit Readiness</h3>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                    {activeProfiles.map((p) => (
                        <div key={p.teamKey} className="glass" style={{ padding: '2rem', borderRadius: '35px', borderLeft: `4px solid ${selectedAlliance === 'red' ? '#ef4444' : '#3b82f6'}33` }}>
                            <div className="flex justify-between items-start" style={{ marginBottom: '1.5rem' }}>
                                <div>
                                    <h4 style={{ fontSize: '2.5rem', fontWeight: 950, fontStyle: 'italic', color: '#fff', lineHeight: 1 }}>{p.teamNum}</h4>
                                    <p style={{ fontSize: '9px', fontWeight: 950, color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Tactical Unit</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{ fontSize: '10px', fontWeight: 950, color: '#22c55e' }}>● READY</span>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                                <div>
                                    <p style={{ fontSize: '8px', fontWeight: 950, color: '#333', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Avg L4 Coral</p>
                                    <p style={{ fontSize: '1.5rem', fontWeight: 950, color: '#fff' }}>{p.avgL4}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '8px', fontWeight: 950, color: '#333', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Deep Climb</p>
                                    <p style={{ fontSize: '1.5rem', fontWeight: 950, color: '#fff' }}>{p.climbRate}%</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '8px', fontWeight: 950, color: '#333', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Auto Mobility</p>
                                    <p style={{ fontSize: '1.5rem', fontWeight: 950, color: '#fff' }}>{p.autoMobility}%</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '8px', fontWeight: 950, color: '#333', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Max Algae</p>
                                    <p style={{ fontSize: '1.5rem', fontWeight: 950, color: '#fff' }}>{p.maxAlgae}</p>
                                </div>
                            </div>

                            <div style={{ position: 'relative' }}>
                                <p style={{ fontSize: '8px', fontWeight: 950, color: selectedAlliance === 'red' ? '#ef4444' : '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>Intelligence Overrides</p>
                                <textarea
                                    placeholder="Enter field observations (e.g. broken intake, special strategy...)"
                                    value={manualNotes[p.teamKey] || ''}
                                    onChange={(e) => setManualNotes({ ...manualNotes, [p.teamKey]: e.target.value })}
                                    style={{
                                        width: '100%',
                                        height: '80px',
                                        background: 'rgba(0,0,0,0.3)',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        borderRadius: '15px',
                                        padding: '1rem',
                                        color: '#ccc',
                                        fontSize: '11px',
                                        resize: 'none',
                                        fontFamily: 'inherit'
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* AI Generation Trigger */}
            <section className="reveal delay-3 flex flex-col items-center" style={{ marginTop: '2rem' }}>
                <button
                    onClick={handleGenerate}
                    disabled={isLoading}
                    className="generate-btn"
                    style={{
                        padding: '1.5rem 4rem',
                        borderRadius: '100px',
                        border: 'none',
                        background: isLoading ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, var(--primary), var(--secondary))',
                        color: '#fff',
                        fontWeight: 950,
                        fontSize: '14px',
                        letterSpacing: '0.1em',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        boxShadow: isLoading ? 'none' : '0 10px 40px rgba(168, 85, 247, 0.3)',
                        transition: 'all 0.3s ease'
                    }}
                >
                    {isLoading ? 'PROCESSING MISSION INTEL...' : 'GENERATE TACTICAL BRIEFING →'}
                </button>

                {briefing && (
                    <div className="glass reveal" style={{ marginTop: '4rem', padding: '3.5rem', borderRadius: '45px', background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, transparent 100%)', borderTop: '1px solid rgba(34, 197, 94, 0.1)', width: '100%' }}>
                        <div className="flex items-center gap-4" style={{ marginBottom: '2.5rem' }}>
                            <div style={{ width: '10px', height: '10px', background: '#22c55e', borderRadius: '2px' }}></div>
                            <span style={{ fontSize: '11px', fontWeight: 950, color: '#22c55e', letterSpacing: '0.3em', textTransform: 'uppercase' }}>Strategic Resolution Active</span>
                        </div>
                        <div className="briefing-content" style={{ fontSize: '1.2rem', color: '#ccc', lineHeight: 1.8 }}>
                            <ReactMarkdown>{briefing}</ReactMarkdown>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}
