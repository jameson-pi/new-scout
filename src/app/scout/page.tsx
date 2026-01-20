'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ScoutForm() {
    const [step, setStep] = useState<'info' | 'auto' | 'teleop' | 'submit'>('info');
    const [formData, setFormData] = useState({
        match: '',
        team: '',
        scouter: '',
        auto: { l1: 0, l2: 0, l3: 0, l4: 0, processor: 0, net: 0, moved: false },
        tele: { l1: 0, l2: 0, l3: 0, l4: 0, processor: 0, net: 0, climb: 'None' }
    });

    const Counter = ({ label, value, color, onChange }: { label: string, value: number, color: string, onChange: (v: number) => void }) => (
        <div className="glass flex items-center justify-between" style={{ padding: '1.25rem', marginBottom: '1rem', borderLeft: `4px solid ${color}`, borderRadius: '20px' }}>
            <div>
                <span style={{ fontSize: '10px', fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#666', marginBottom: '0.25rem', display: 'block' }}>{label}</span>
                <span style={{ fontSize: '2.5rem', fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.05em' }}>{value}</span>
            </div>
            <div className="flex" style={{ gap: '0.75rem' }}>
                <button
                    onClick={() => onChange(Math.max(0, value - 1))}
                    style={{ width: '3rem', height: '3rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" /></svg>
                </button>
                <button
                    onClick={() => onChange(value + 1)}
                    style={{ width: '3rem', height: '3rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                </button>
            </div>
        </div>
    );

    return (
        <main style={{ minHeight: '100vh', background: '#000', color: '#fff', padding: '2rem 1.5rem 8rem 1.5rem' }}>
            <div className="mx-auto" style={{ maxWidth: '500px' }}>

                <header className="flex items-center justify-between reveal" style={{ marginBottom: '3rem' }}>
                    <Link href="/" style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                        <svg style={{ width: '1.25rem', height: '1.25rem', color: '#888' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </Link>
                    <div className="text-center">
                        <h1 style={{ fontSize: '0.750rem', fontWeight: 950, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--primary)' }}>Mission Intel</h1>
                        <p style={{ fontSize: '9px', fontFamily: 'monospace', color: '#555', textTransform: 'uppercase' }}>Event: 2025txwac • Waco District</p>
                    </div>
                    <div style={{ width: '2.5rem' }}></div>
                </header>

                <div className="flex reveal delay-1" style={{ gap: '0.5rem', marginBottom: '3rem' }}>
                    {(['info', 'auto', 'teleop', 'submit'] as const).map((s) => (
                        <div key={s} style={{ height: '4px', flex: 1, borderRadius: '10px', transition: 'all 0.5s ease', background: step === s ? 'var(--primary)' : 'rgba(255,255,255,0.1)', boxShadow: step === s ? '0 0 15px var(--primary)' : 'none' }}></div>
                    ))}
                </div>

                {step === 'info' && (
                    <div className="reveal delay-2" style={{ display: 'grid', gap: '2rem' }}>
                        <div>
                            <h2 style={{ fontSize: '3rem', fontWeight: 950, fontStyle: 'italic', letterSpacing: '-0.05em' }}>PHASE <span className="text-primary">ALPHA</span></h2>
                            <p style={{ color: '#555', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Context Alignment</p>
                        </div>

                        <div style={{ display: 'grid', gap: '1rem' }}>
                            <input
                                type="text" placeholder="Match (e.g. qm12)"
                                style={{ width: '100%', background: '#0a0a0d', border: '1px solid rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '20px', fontSize: '1.5rem', fontWeight: 700, color: '#fff', outline: 'none' }}
                                value={formData.match} onChange={e => setFormData({ ...formData, match: e.target.value })}
                            />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <input
                                    type="text" placeholder="Team ID"
                                    style={{ width: '100%', background: '#0a0a0d', border: '1px solid rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '20px', fontSize: '1.5rem', fontWeight: 700, color: '#fff', outline: 'none' }}
                                    value={formData.team} onChange={e => setFormData({ ...formData, team: e.target.value })}
                                />
                                <input
                                    type="text" placeholder="Scouter"
                                    style={{ width: '100%', background: '#0a0a0d', border: '1px solid rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '20px', fontSize: '1.5rem', fontWeight: 700, color: '#fff', outline: 'none' }}
                                    value={formData.scouter} onChange={e => setFormData({ ...formData, scouter: e.target.value })}
                                />
                            </div>
                        </div>

                        <button
                            onClick={() => setStep('auto')}
                            disabled={!formData.match || !formData.team}
                            className="btn-primary"
                            style={{ opacity: (!formData.match || !formData.team) ? 0.3 : 1 }}
                        >INITIALIZE SCANS</button>
                    </div>
                )}

                {step === 'auto' && (
                    <div className="reveal" style={{ display: 'grid', gap: '2rem' }}>
                        <div>
                            <h2 style={{ fontSize: '3rem', fontWeight: 950, fontStyle: 'italic', letterSpacing: '-0.05em', color: '#eab308' }}>AUTO<span style={{ color: '#fff' }}>NOMOUS</span></h2>
                            <p style={{ color: '#555', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sensor Evaluation</p>
                        </div>

                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                            <Counter label="Level 4 Coral" value={formData.auto.l4} color="#a855f7" onChange={v => setFormData({ ...formData, auto: { ...formData.auto, l4: v } })} />
                            <Counter label="Level 3 Coral" value={formData.auto.l3} color="#8b5cf6" onChange={v => setFormData({ ...formData, auto: { ...formData.auto, l3: v } })} />
                            <Counter label="Net Algae" value={formData.auto.net} color="#f43f5e" onChange={v => setFormData({ ...formData, auto: { ...formData.auto, net: v } })} />
                        </div>

                        <button
                            onClick={() => setFormData({ ...formData, auto: { ...formData.auto, moved: !formData.auto.moved } })}
                            style={{ padding: '1.5rem', borderRadius: '20px', border: '2px solid', transition: 'all 0.3s', fontWeight: 900, fontStyle: 'italic', cursor: 'pointer', background: formData.auto.moved ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)', borderColor: formData.auto.moved ? '#22c55e' : 'rgba(255,255,255,0.1)', color: formData.auto.moved ? '#22c55e' : '#555' }}
                        >
                            {formData.auto.moved ? '● ROBOT MOBILIZED' : '○ MOBILITY PENDING'}
                        </button>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1rem' }}>
                            <button onClick={() => setStep('info')} style={{ padding: '1.25rem', borderRadius: '20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#888', fontWeight: 700, cursor: 'pointer' }}>BACK</button>
                            <button onClick={() => setStep('teleop')} className="btn-primary">TELEOP NEXT</button>
                        </div>
                    </div>
                )}

                {step === 'teleop' && (
                    <div className="reveal" style={{ display: 'grid', gap: '2rem' }}>
                        <div>
                            <h2 style={{ fontSize: '3rem', fontWeight: 950, fontStyle: 'italic', letterSpacing: '-0.05em', color: 'var(--secondary)' }}>TELE<span style={{ color: '#fff' }}>OPERATED</span></h2>
                            <p style={{ color: '#555', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Performance Metrics</p>
                        </div>

                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                            <Counter label="L4 Coral Cycles" value={formData.tele.l4} color="var(--secondary)" onChange={v => setFormData({ ...formData, tele: { ...formData.tele, l4: v } })} />
                            <Counter label="L3 Coral Cycles" value={formData.tele.l3} color="#0891b2" onChange={v => setFormData({ ...formData, tele: { ...formData.tele, l3: v } })} />
                            <Counter label="Processor Algae" value={formData.tele.processor} color="#f43f5e" onChange={v => setFormData({ ...formData, tele: { ...formData.tele, processor: v } })} />
                        </div>

                        <div className="glass" style={{ padding: '1.5rem', borderRadius: '24px' }}>
                            <p style={{ fontSize: '9px', fontWeight: 950, color: '#555', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '1rem' }}>Endgame Status</p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                                {['None', 'Park', 'Shallow', 'Deep'].map(climb => (
                                    <button
                                        key={climb}
                                        onClick={() => setFormData({ ...formData, tele: { ...formData.tele, climb: climb as any } })}
                                        style={{ padding: '1rem', borderRadius: '12px', border: '1px solid', fontSize: '11px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.3s', background: formData.tele.climb === climb ? 'var(--secondary)' : 'rgba(255,255,255,0.05)', borderColor: formData.tele.climb === climb ? 'var(--secondary)' : 'rgba(255,255,255,0.05)', color: formData.tele.climb === climb ? '#000' : '#555' }}
                                    >{climb}</button>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1rem' }}>
                            <button onClick={() => setStep('auto')} style={{ padding: '1.25rem', borderRadius: '20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#888', fontWeight: 700, cursor: 'pointer' }}>BACK</button>
                            <button onClick={() => setStep('submit')} className="btn-primary" style={{ background: '#22c55e', color: '#000' }}>FINALIZE REPORT</button>
                        </div>
                    </div>
                )}

                {step === 'submit' && (
                    <div className="reveal flex flex-col items-center" style={{ marginTop: '3rem' }}>
                        <div style={{ position: 'relative', marginBottom: '4rem' }}>
                            <div style={{ position: 'absolute', inset: 0, background: '#22c55e', filter: 'blur(50px)', opacity: 0.15 }}></div>
                            <div className="glass flex flex-col items-center" style={{ padding: '4rem', borderRadius: '50px', border: '1px solid rgba(34,197,94,0.2)', position: 'relative' }}>
                                <svg style={{ width: '5rem', height: '5rem', color: '#22c55e', marginBottom: '1.5rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                <h2 style={{ fontSize: '3rem', fontWeight: 950, fontStyle: 'italic', letterSpacing: '-0.05em' }}>COMPLETE</h2>
                                <p style={{ fontSize: '10px', fontFamily: 'monospace', color: '#555', textTransform: 'uppercase', letterSpacing: '0.3em' }}>Match {formData.match} • Team {formData.team}</p>
                            </div>
                        </div>

                        <div className="w-full" style={{ display: 'grid', gap: '1rem' }}>
                            <button
                                onClick={() => alert('Mission Transmitted.')}
                                className="btn-primary"
                                style={{ background: 'linear-gradient(90deg, #22c55e, #10b981)', color: '#000', padding: '2rem', fontSize: '1.75rem', borderRadius: '30px' }}
                            >TRANSMIT DATA</button>
                            <button onClick={() => setStep('teleop')} style={{ background: 'none', border: 'none', color: '#444', fontWeight: 800, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer' }}>RE-VERIFY SENSORS</button>
                        </div>
                    </div>
                )}

            </div>
        </main>
    );
}
