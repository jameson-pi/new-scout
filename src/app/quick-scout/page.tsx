'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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
        console.log('Quick Scout Data:', formData);
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

    const Counter = ({ value, onChange, label, max = 99 }: { value: number; onChange: (v: number) => void; label: string; max?: number }) => (
        <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '10px', fontWeight: 900, color: '#888', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{label}</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                <button
                    onClick={() => onChange(Math.max(0, value - 1))}
                    style={{ width: '50px', height: '50px', borderRadius: '15px', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', fontSize: '1.5rem', fontWeight: 900, cursor: 'pointer' }}
                >
                    −
                </button>
                <span style={{ fontSize: '2.5rem', fontWeight: 950, color: 'var(--primary)', minWidth: '60px' }}>{value}</span>
                <button
                    onClick={() => onChange(Math.min(max, value + 1))}
                    style={{ width: '50px', height: '50px', borderRadius: '15px', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', fontSize: '1.5rem', fontWeight: 900, cursor: 'pointer' }}
                >
                    +
                </button>
            </div>
        </div>
    );

    return (
        <main style={{ minHeight: '100vh', background: '#000', color: '#fff', padding: '2rem' }}>
            <div className="mx-auto" style={{ maxWidth: '500px' }}>
                <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: 950, fontStyle: 'italic', color: 'var(--primary)' }}>
                        QUICK SCOUT
                    </h1>
                    <p style={{ color: '#888', fontSize: '0.9rem' }}>Fast mobile data entry • REBUILT 2026</p>
                </header>

                {submitted ? (
                    <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✓</div>
                        <p style={{ fontSize: '1.5rem', fontWeight: 950, color: 'var(--secondary)' }}>SUBMITTED!</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                        {/* Team & Match */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={{ fontSize: '10px', fontWeight: 900, color: '#888', textTransform: 'uppercase' }}>Team #</label>
                                <input
                                    type="number"
                                    value={formData.teamNumber}
                                    onChange={(e) => setFormData({ ...formData, teamNumber: e.target.value })}
                                    style={{ width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '15px', color: '#fff', fontSize: '1.5rem', fontWeight: 950 }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '10px', fontWeight: 900, color: '#888', textTransform: 'uppercase' }}>Match #</label>
                                <input
                                    type="number"
                                    value={formData.matchNumber}
                                    onChange={(e) => setFormData({ ...formData, matchNumber: e.target.value })}
                                    style={{ width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '15px', color: '#fff', fontSize: '1.5rem', fontWeight: 950 }}
                                />
                            </div>
                        </div>

                        {/* Fuel Counters */}
                        <div className="glass" style={{ padding: '1.5rem', borderRadius: '25px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                                <Counter label="Auto Fuel" value={formData.autoFuel} onChange={(v) => setFormData({ ...formData, autoFuel: v })} />
                                <Counter label="Teleop Fuel" value={formData.teleopFuel} onChange={(v) => setFormData({ ...formData, teleopFuel: v })} />
                            </div>
                        </div>

                        {/* Tower Level */}
                        <div className="glass" style={{ padding: '1.5rem', borderRadius: '25px' }}>
                            <p style={{ fontSize: '10px', fontWeight: 900, color: '#888', textTransform: 'uppercase', marginBottom: '1rem' }}>Tower Level</p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                                {(['None', 'Level1', 'Level2', 'Level3'] as const).map(level => (
                                    <button
                                        key={level}
                                        onClick={() => setFormData({ ...formData, towerLevel: level })}
                                        style={{
                                            padding: '1rem',
                                            borderRadius: '10px',
                                            border: 'none',
                                            background: formData.towerLevel === level ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                            color: formData.towerLevel === level ? '#000' : '#fff',
                                            fontWeight: 900,
                                            fontSize: '0.7rem',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {level === 'None' ? 'NONE' : level.replace('Level', 'LVL ')}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Failure */}
                        <button
                            onClick={() => setFormData({ ...formData, mechFailure: !formData.mechFailure })}
                            style={{
                                padding: '1rem',
                                borderRadius: '15px',
                                border: formData.mechFailure ? '2px solid #ef4444' : '2px solid rgba(255,255,255,0.1)',
                                background: formData.mechFailure ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                                color: formData.mechFailure ? '#ef4444' : '#888',
                                fontWeight: 950,
                                cursor: 'pointer',
                                fontSize: '1rem'
                            }}
                        >
                            ⚠️ MECHANICAL FAILURE
                        </button>

                        {/* Notes */}
                        <textarea
                            placeholder="Quick notes..."
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '1rem',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '15px',
                                color: '#fff',
                                fontSize: '1rem',
                                minHeight: '80px',
                                resize: 'none'
                            }}
                        />

                        {/* Submit */}
                        <button
                            onClick={handleSubmit}
                            disabled={!formData.teamNumber || !formData.matchNumber}
                            style={{
                                padding: '1.5rem',
                                borderRadius: '20px',
                                border: 'none',
                                background: formData.teamNumber && formData.matchNumber ? 'var(--secondary)' : 'rgba(255,255,255,0.05)',
                                color: formData.teamNumber && formData.matchNumber ? '#000' : '#444',
                                fontWeight: 950,
                                fontSize: '1.25rem',
                                cursor: formData.teamNumber && formData.matchNumber ? 'pointer' : 'not-allowed'
                            }}
                        >
                            SUBMIT SCOUT DATA
                        </button>
                    </div>
                )}
            </div>
        </main>
    );
}
