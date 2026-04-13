'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import QuickScoutCounter from '@/components/QuickScoutCounter';

interface QuickScoutFormData {
    teamNumber: string;
    matchNumber: string;
    autoFuel: number;
    teleopFuel: number;
    towerLevel: 'None' | 'Level1' | 'Level2' | 'Level3';
    mechFailure: boolean;
    notes: string;
}

export default function QuickScoutPage() {
    const [formData, setFormData] = useState<QuickScoutFormData>({
        teamNumber: '',
        matchNumber: '',
        autoFuel: 0,
        teleopFuel: 0,
        towerLevel: 'None',
        mechFailure: false,
        notes: ''
    });
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = () => {
        setSubmitted(true);
        setTimeout(() => {
            setSubmitted(false);
            setFormData({
                teamNumber: '',
                matchNumber: '',
                autoFuel: 0,
                teleopFuel: 0,
                towerLevel: 'None',
                mechFailure: false,
                notes: ''
            });
        }, 2000);
    };

    return (
        <main style={{ minHeight: '100vh', background: 'var(--background)', color: 'var(--foreground)', padding: '1.25rem' }}>
            <div className="mx-auto" style={{ maxWidth: '560px' }}>
                <header style={{ marginBottom: '2rem', textAlign: 'center', display: 'grid', gap: '0.8rem' }}>
                    <Link href="/" style={{ justifySelf: 'start', textDecoration: 'none', color: 'var(--primary-teal)', fontSize: '12px', fontWeight: 950, letterSpacing: '0.1em', textTransform: 'uppercase' }}>← Back</Link>
                    <h1 style={{ fontSize: 'clamp(2.2rem, 8vw, 3.5rem)', fontWeight: 950, background: 'linear-gradient(135deg, var(--primary-teal) 0%, var(--primary-brown) 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent' }}>
                        ⚡ Quick Scout
                    </h1>
                    <p style={{ color: 'var(--muted)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Fast Mobile Data Entry • REBUILT 2026</p>
                </header>

                {submitted ? (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '0.8rem' }}>✓</div>
                        <p style={{ fontSize: '1.25rem', fontWeight: 760, color: 'var(--secondary)' }}>Submitted</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {/* Team & Match */}
                        <div className="quick-fields" style={{ display: 'grid', gridTemplateColumns: 'clamp(1fr, 50%, 1fr) clamp(1fr, 50%, 1fr)', gap: '1rem' }}>
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 950, color: 'var(--primary-teal)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '0.5rem' }}>🤖 Team #</label>
                                <input
                                    type="number"
                                    value={formData.teamNumber}
                                    onChange={(e) => setFormData({ ...formData, teamNumber: e.target.value })}
                                    style={{ width: '100%', padding: '1rem', background: 'rgba(0,204,204,0.1)', border: '2px solid var(--primary-teal)', borderRadius: '15px', color: '#fff', fontSize: 'clamp(1.25rem, 4vw, 1.5rem)', fontWeight: 950 }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 950, color: 'var(--primary-brown)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '0.5rem' }}>🎯 Match #</label>
                                <input
                                    type="number"
                                    value={formData.matchNumber}
                                    onChange={(e) => setFormData({ ...formData, matchNumber: e.target.value })}
                                    style={{ width: '100%', padding: '1rem', background: 'rgba(138,88,35,0.1)', border: '2px solid var(--primary-brown)', borderRadius: '15px', color: '#fff', fontSize: 'clamp(1.25rem, 4vw, 1.5rem)', fontWeight: 950 }}
                                />
                            </div>
                        </div>

                        {/* Fuel Counters */}
                        <div className="glass" style={{ padding: '1.25rem', borderRadius: '18px' }}>
                            <div className="quick-counters" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                                <QuickScoutCounter label="Auto Fuel" value={formData.autoFuel} onChange={(v) => setFormData({ ...formData, autoFuel: v })} />
                                <QuickScoutCounter label="Teleop Fuel" value={formData.teleopFuel} onChange={(v) => setFormData({ ...formData, teleopFuel: v })} />
                            </div>
                        </div>

                        {/* Tower Level */}
                        <div className="glass" style={{ padding: '1.25rem', borderRadius: '18px' }}>
                            <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '0.8rem' }}>Tower Level</p>
                            <div className="quick-tower" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                                {(['None', 'Level1', 'Level2', 'Level3'] as const).map(level => (
                                    <button
                                        key={level}
                                        onClick={() => setFormData({ ...formData, towerLevel: level })}
                                        style={{
                                            padding: '0.8rem 0.5rem',
                                            borderRadius: '10px',
                                            border: '1px solid rgba(255,255,255,0.12)',
                                            background: formData.towerLevel === level ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                            color: formData.towerLevel === level ? '#000' : '#fff',
                                            fontWeight: 700,
                                            fontSize: '0.72rem',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {level === 'None' ? 'None' : level.replace('Level', 'L')}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Failure */}
                        <button
                            onClick={() => setFormData({ ...formData, mechFailure: !formData.mechFailure })}
                            style={{
                                padding: '0.9rem',
                                borderRadius: '12px',
                                border: formData.mechFailure ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.12)',
                                background: formData.mechFailure ? 'rgba(239, 68, 68, 0.18)' : 'transparent',
                                color: formData.mechFailure ? '#ef4444' : 'var(--muted)',
                                fontWeight: 700,
                                cursor: 'pointer',
                                fontSize: '0.95rem'
                            }}
                        >
                            Mechanical failure
                        </button>

                        {/* Notes */}
                        <textarea
                            placeholder="Quick notes..."
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '0.9rem',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.12)',
                                borderRadius: '12px',
                                color: '#fff',
                                fontSize: '0.95rem',
                                minHeight: '84px',
                                resize: 'none'
                            }}
                        />

                        {/* Submit */}
                        <button
                            onClick={handleSubmit}
                            disabled={!formData.teamNumber || !formData.matchNumber}
                            style={{
                                padding: '1rem',
                                borderRadius: '14px',
                                border: 'none',
                                background: formData.teamNumber && formData.matchNumber ? 'var(--secondary)' : 'rgba(255,255,255,0.06)',
                                color: formData.teamNumber && formData.matchNumber ? '#000' : '#666',
                                fontWeight: 760,
                                fontSize: '1rem',
                                cursor: formData.teamNumber && formData.matchNumber ? 'pointer' : 'not-allowed'
                            }}
                        >
                            Submit scout data
                        </button>
                    </div>
                )}
            </div>
        </main>
    );
}
