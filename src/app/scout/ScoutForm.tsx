'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { saveScoutReport } from '@/lib/actions';

interface MatchInfo {
    key: string;
    matchNumber: number;
    red: string[];
    blue: string[];
}

interface ScoutFormProps {
    initialSchedule: MatchInfo[];
    initialScouters: string[];
}

export default function ScoutForm({ initialSchedule, initialScouters }: ScoutFormProps) {
    const [step, setStep] = useState<'info' | 'auto' | 'teleop' | 'submit'>('info');
    const [scouters, setScouters] = useState(initialScouters);
    const [formData, setFormData] = useState({
        match: '',
        team: '',
        scouter: '',
        auto: { l1: 0, l2: 0, l3: 0, l4: 0, processor: 0, net: 0, moved: false },
        tele: { l1: 0, l2: 0, l3: 0, l4: 0, processor: 0, net: 0, climb: 'None' as 'None' | 'Park' | 'Shallow' | 'Deep' }
    });

    const selectedMatchData = useMemo(() => {
        return initialSchedule.find(m => m.key === formData.match);
    }, [formData.match, initialSchedule]);

    const availableTeams = useMemo(() => {
        if (!selectedMatchData) return [];
        return [
            ...selectedMatchData.red.map(t => ({ key: t, color: '#ef4444', label: `RED: ${t.replace('frc', '')}` })),
            ...selectedMatchData.blue.map(t => ({ key: t, color: '#3b82f6', label: `BLUE: ${t.replace('frc', '')}` }))
        ];
    }, [selectedMatchData]);

    const Counter = ({ label, value, color, onChange }: { label: string, value: number, color: string, onChange: (v: number) => void }) => (
        <div className="glass flex items-center justify-between" style={{ padding: '1.5rem', marginBottom: '1rem', borderLeft: `6px solid ${color}`, borderRadius: '25px' }}>
            <div>
                <span style={{ fontSize: '11px', fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#fff', marginBottom: '0.5rem', display: 'block' }}>{label}</span>
                <span style={{ fontSize: '3.5rem', fontWeight: 950, fontStyle: 'italic', letterSpacing: '-0.05em', lineHeight: 1 }}>{value}</span>
            </div>
            <div className="flex" style={{ gap: '1rem' }}>
                <button
                    onClick={() => onChange(Math.max(0, value - 1))}
                    style={{ width: '4rem', height: '4rem', borderRadius: '15px', background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    <svg style={{ width: '2rem', height: '2rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M20 12H4" /></svg>
                </button>
                <button
                    onClick={() => onChange(value + 1)}
                    style={{ width: '4rem', height: '4rem', borderRadius: '15px', background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    <svg style={{ width: '2rem', height: '2rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M12 4v16m8-8H4" /></svg>
                </button>
            </div>
        </div>
    );

    return (
        <main style={{ minHeight: '100vh', background: '#000', color: '#fff', padding: '2rem 1.5rem 8rem 1.5rem' }}>
            <div className="mx-auto" style={{ maxWidth: '500px' }}>

                <header className="flex items-center justify-between reveal" style={{ marginBottom: '3rem' }}>
                    <Link href="/" style={{ width: '3rem', height: '3rem', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                        <svg style={{ width: '1.5rem', height: '1.5rem', color: '#fff' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </Link>
                    <div className="text-center">
                        <h1 style={{ fontSize: '0.875rem', fontWeight: 950, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--primary)' }}>MISSION INTEL</h1>
                        <p style={{ fontSize: '10px', fontFamily: 'monospace', color: '#888', textTransform: 'uppercase', fontWeight: 700 }}>Event: 2025txwac • Waco District</p>
                    </div>
                    <div style={{ width: '3rem' }}></div>
                </header>

                <div className="flex reveal delay-1" style={{ gap: '0.5rem', marginBottom: '3rem' }}>
                    {(['info', 'auto', 'teleop', 'submit'] as const).map((s) => (
                        <div key={s} style={{ height: '6px', flex: 1, borderRadius: '10px', transition: 'all 0.5s ease', background: step === s ? 'var(--primary)' : 'rgba(255,255,255,0.1)', boxShadow: step === s ? '0 0 20px var(--primary)' : 'none' }}></div>
                    ))}
                </div>

                {step === 'info' && (
                    <div className="reveal delay-2" style={{ display: 'grid', gap: '2rem' }}>
                        <div>
                            <h2 style={{ fontSize: '3.5rem', fontWeight: 950, fontStyle: 'italic', letterSpacing: '-0.05em', lineHeight: 0.9 }}>PHASE <span className="text-primary">ALPHA</span></h2>
                            <p style={{ color: '#fff', fontSize: '12px', fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: '0.5rem' }}>Context Alignment</p>
                        </div>

                        <div style={{ display: 'grid', gap: '1.25rem' }}>
                            <div className="glass" style={{ padding: '1.5rem', borderRadius: '25px' }}>
                                <p style={{ fontSize: '11px', fontWeight: 950, color: '#fff', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.1em' }}>SELECT MATCH</p>
                                <select
                                    style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '2rem', fontWeight: 950, outline: 'none', cursor: 'pointer', fontStyle: 'italic' }}
                                    value={formData.match}
                                    onChange={e => {
                                        setFormData({ ...formData, match: e.target.value, team: '' });
                                    }}
                                >
                                    <option value="" style={{ background: '#000' }}>-- CHOOSE MATCH --</option>
                                    {initialSchedule.map(m => (
                                        <option key={m.key} value={m.key} style={{ background: '#000' }}>QM {m.matchNumber}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="glass" style={{ padding: '1.5rem', borderRadius: '25px', opacity: formData.match ? 1 : 0.3 }}>
                                <p style={{ fontSize: '11px', fontWeight: 950, color: '#fff', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.1em' }}>SELECT TEAM</p>
                                <select
                                    disabled={!formData.match}
                                    style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '2rem', fontWeight: 950, outline: 'none', cursor: 'pointer', fontStyle: 'italic' }}
                                    value={formData.team}
                                    onChange={e => setFormData({ ...formData, team: e.target.value })}
                                >
                                    <option value="" style={{ background: '#000' }}>-- CHOOSE TEAM --</option>
                                    {availableTeams.map(t => (
                                        <option key={t.key} value={t.key} style={{ background: '#000', color: t.color }}>{t.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="glass" style={{ padding: '1.5rem', borderRadius: '25px' }}>
                                <p style={{ fontSize: '11px', fontWeight: 950, color: '#fff', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.1em' }}>SCOUTER IDENTITY</p>
                                <select
                                    style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '2rem', fontWeight: 950, outline: 'none', cursor: 'pointer', fontStyle: 'italic' }}
                                    value={formData.scouter}
                                    onChange={e => setFormData({ ...formData, scouter: e.target.value })}
                                >
                                    <option value="" style={{ background: '#000' }}>-- IDENTITY REQUIRED --</option>
                                    {scouters.map(s => (
                                        <option key={s} value={s} style={{ background: '#000' }}>{s}</option>
                                    ))}
                                    <option value="NEW" style={{ background: '#000' }}>+ Register New...</option>
                                </select>
                                {formData.scouter === 'NEW' && (
                                    <input
                                        type="text"
                                        placeholder="Enter Name"
                                        autoFocus
                                        style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: 'none', borderBottom: '2px solid var(--primary)', color: '#fff', marginTop: '1.5rem', padding: '1rem', outline: 'none', fontSize: '1.25rem', fontWeight: 900 }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                const name = (e.currentTarget as HTMLInputElement).value;
                                                if (name) {
                                                    setScouters([...scouters, name]);
                                                    setFormData({ ...formData, scouter: name });
                                                }
                                            }
                                        }}
                                        onBlur={(e) => {
                                            const name = e.target.value;
                                            if (name) {
                                                setScouters([...scouters, name]);
                                                setFormData({ ...formData, scouter: name });
                                            }
                                        }}
                                    />
                                )}
                            </div>
                        </div>

                        <button
                            onClick={() => setStep('auto')}
                            disabled={!formData.match || !formData.team || !formData.scouter || formData.scouter === 'NEW'}
                            className="btn-primary"
                            style={{ opacity: (!formData.match || !formData.team || !formData.scouter || formData.scouter === 'NEW') ? 0.3 : 1 }}
                        >INITIALIZE SCANS</button>
                    </div>
                )}

                {step === 'auto' && (
                    <div className="reveal" style={{ display: 'grid', gap: '2rem' }}>
                        <div>
                            <div className="flex justify-between items-center">
                                <h2 style={{ fontSize: '3.5rem', fontWeight: 950, fontStyle: 'italic', letterSpacing: '-0.05em', color: '#eab308', lineHeight: 0.9 }}>AUTO<span style={{ color: '#fff' }}>NOMOUS</span></h2>
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 950, color: '#888' }}>QM {selectedMatchData?.matchNumber} • {formData.team.replace('frc', '')}</span>
                                </div>
                            </div>
                            <p style={{ color: '#fff', fontSize: '12px', fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: '0.5rem' }}>Sensor Evaluation</p>
                        </div>

                        <div style={{ display: 'grid', gap: '1rem' }}>
                            <Counter label="Level 4 Coral" value={formData.auto.l4} color="#a855f7" onChange={v => setFormData({ ...formData, auto: { ...formData.auto, l4: v } })} />
                            <Counter label="Level 3 Coral" value={formData.auto.l3} color="#8b5cf6" onChange={v => setFormData({ ...formData, auto: { ...formData.auto, l3: v } })} />
                            <Counter label="Level 2 Coral" value={formData.auto.l2} color="#7c3aed" onChange={v => setFormData({ ...formData, auto: { ...formData.auto, l2: v } })} />
                            <Counter label="Level 1 Coral" value={formData.auto.l1} color="#6d28d9" onChange={v => setFormData({ ...formData, auto: { ...formData.auto, l1: v } })} />
                            <Counter label="Processor Algae" value={formData.auto.processor} color="#f43f5e" onChange={v => setFormData({ ...formData, auto: { ...formData.auto, processor: v } })} />
                            <Counter label="Net Algae" value={formData.auto.net} color="#be123c" onChange={v => setFormData({ ...formData, auto: { ...formData.auto, net: v } })} />
                        </div>

                        <button
                            onClick={() => setFormData({ ...formData, auto: { ...formData.auto, moved: !formData.auto.moved } })}
                            style={{ padding: '2rem', borderRadius: '25px', border: '3px solid', transition: 'all 0.3s', fontWeight: 950, fontStyle: 'italic', cursor: 'pointer', background: formData.auto.moved ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)', borderColor: formData.auto.moved ? '#22c55e' : 'rgba(255,255,255,0.1)', color: formData.auto.moved ? '#22c55e' : '#888', fontSize: '1.25rem' }}
                        >
                            {formData.auto.moved ? '● ROBOT MOBILIZED' : '○ MOBILITY PENDING'}
                        </button>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1rem', marginTop: '1rem' }}>
                            <button onClick={() => setStep('info')} style={{ padding: '1.5rem', borderRadius: '25px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontWeight: 900, cursor: 'pointer' }}>BACK</button>
                            <button onClick={() => setStep('teleop')} className="btn-primary" style={{ padding: '1.5rem', fontSize: '1.25rem' }}>TELEOP NEXT</button>
                        </div>
                    </div>
                )}

                {step === 'teleop' && (
                    <div className="reveal" style={{ display: 'grid', gap: '2rem' }}>
                        <div>
                            <div className="flex justify-between items-center">
                                <h2 style={{ fontSize: '3.5rem', fontWeight: 950, fontStyle: 'italic', letterSpacing: '-0.05em', color: 'var(--secondary)', lineHeight: 0.9 }}>TELE<span style={{ color: '#fff' }}>OPERATED</span></h2>
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 950, color: '#888' }}>QM {selectedMatchData?.matchNumber} • {formData.team.replace('frc', '')}</span>
                                </div>
                            </div>
                            <p style={{ color: '#fff', fontSize: '12px', fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: '0.5rem' }}>Performance Metrics</p>
                        </div>

                        <div style={{ display: 'grid', gap: '1rem' }}>
                            <Counter label="Level 4 Coral" value={formData.tele.l4} color="var(--secondary)" onChange={v => setFormData({ ...formData, tele: { ...formData.tele, l4: v } })} />
                            <Counter label="Level 3 Coral" value={formData.tele.l3} color="#0891b2" onChange={v => setFormData({ ...formData, tele: { ...formData.tele, l3: v } })} />
                            <Counter label="Level 2 Coral" value={formData.tele.l2} color="#06b6d4" onChange={v => setFormData({ ...formData, tele: { ...formData.tele, l2: v } })} />
                            <Counter label="Level 1 Coral" value={formData.tele.l1} color="#22d3ee" onChange={v => setFormData({ ...formData, tele: { ...formData.tele, l1: v } })} />
                            <Counter label="Processor Algae" value={formData.tele.processor} color="#f43f5e" onChange={v => setFormData({ ...formData, tele: { ...formData.tele, processor: v } })} />
                            <Counter label="Net Algae" value={formData.tele.net} color="#be123c" onChange={v => setFormData({ ...formData, tele: { ...formData.tele, net: v } })} />
                            <Counter label="Algae Removed" value={(formData as any).algae_removed || 0} color="#fb7185" onChange={v => setFormData({ ...formData, algae_removed: v } as any)} />
                            <Counter label="Defender Rating (1-5)" value={(formData as any).defender_rating || 3} color="#94a3b8" onChange={v => setFormData({ ...formData, defender_rating: Math.min(5, Math.max(1, v)) } as any)} />
                        </div>

                        <div className="glass" style={{ padding: '2rem', borderRadius: '30px' }}>
                            <p style={{ fontSize: '11px', fontWeight: 950, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '1.5rem' }}>Coral Logistics</p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                                {(['Floor', 'Station', 'Both'] as const).map(src => (
                                    <button
                                        key={src}
                                        onClick={() => setFormData({ ...formData, coral_source: src } as any)}
                                        style={{ padding: '1.25rem', borderRadius: '15px', border: '2px solid', fontSize: '12px', fontWeight: 950, fontStyle: 'italic', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.3s', background: (formData as any).coral_source === src ? 'var(--primary)' : 'rgba(255,255,255,0.05)', borderColor: (formData as any).coral_source === src ? 'var(--primary)' : 'rgba(255,255,255,0.05)', color: (formData as any).coral_source === src ? '#000' : '#888' }}
                                    >{src}</button>
                                ))}
                            </div>
                        </div>

                        <div className="glass" style={{ padding: '2rem', borderRadius: '30px' }}>
                            <p style={{ fontSize: '11px', fontWeight: 950, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '1.5rem' }}>Mission Endgame</p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                {(['None', 'Park', 'Shallow', 'Deep'] as const).map(climb => (
                                    <button
                                        key={climb}
                                        onClick={() => setFormData({ ...formData, tele: { ...formData.tele, climb: climb } })}
                                        style={{ padding: '1rem', borderRadius: '12px', border: '1px solid', fontSize: '10px', fontWeight: 950, fontStyle: 'italic', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.3s', background: formData.tele.climb === climb ? 'var(--secondary)' : 'rgba(255,255,255,0.05)', borderColor: formData.tele.climb === climb ? 'var(--secondary)' : 'rgba(255,255,255,0.05)', color: formData.tele.climb === climb ? '#000' : '#888' }}
                                    >{climb}</button>
                                ))}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                                {(['Slow', 'Normal', 'Fast', 'Failed'] as const).map(spd => (
                                    <button
                                        key={spd}
                                        onClick={() => setFormData({ ...formData, climb_speed: spd } as any)}
                                        style={{ padding: '1rem', borderRadius: '12px', border: '1px solid', fontSize: '10px', fontWeight: 950, fontStyle: 'italic', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.3s', background: (formData as any).climb_speed === spd ? '#22c55e' : 'rgba(255,255,255,0.05)', borderColor: (formData as any).climb_speed === spd ? '#22c55e' : 'rgba(255,255,255,0.05)', color: (formData as any).climb_speed === spd ? '#000' : '#888' }}
                                    >{spd}</button>
                                ))}
                            </div>
                        </div>

                        <div className="glass" style={{ padding: '2rem', borderRadius: '30px' }}>
                            <p style={{ fontSize: '11px', fontWeight: 950, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '1rem' }}>Field Intelligence (Notes)</p>
                            <textarea
                                placeholder="Report mechanical issues, driver quirks, or tactical observations..."
                                value={(formData as any).notes || ''}
                                onChange={e => setFormData({ ...formData, notes: e.target.value } as any)}
                                style={{ width: '100%', minHeight: '120px', background: 'rgba(255,255,255,0.03)', border: '2px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '1.25rem', color: '#fff', fontSize: '1rem', outline: 'none', resize: 'none' }}
                            />
                            <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <button
                                    onClick={() => setFormData({ ...formData, mech_failure: !(formData as any).mech_failure } as any)}
                                    style={{ padding: '0.75rem 1.5rem', borderRadius: '15px', background: (formData as any).mech_failure ? '#ef4444' : 'rgba(239, 68, 68, 0.1)', color: (formData as any).mech_failure ? '#000' : '#ef4444', border: 'none', fontWeight: 950, fontSize: '11px', textTransform: 'uppercase', cursor: 'pointer' }}
                                >
                                    {(formData as any).mech_failure ? '● MECH FAILURE LOGGED' : '○ NO MECHANICAL ISSUES'}
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1rem' }}>
                            <button onClick={() => setStep('auto')} style={{ padding: '1.5rem', borderRadius: '25px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontWeight: 900, cursor: 'pointer' }}>BACK</button>
                            <button onClick={() => setStep('submit')} className="btn-primary" style={{ background: '#22c55e', color: '#000', padding: '1.5rem', fontSize: '1.25rem' }}>FINALIZE REPORT</button>
                        </div>
                    </div>
                )}

                {step === 'submit' && (
                    <div className="reveal flex flex-col items-center" style={{ marginTop: '3rem' }}>
                        <div style={{ position: 'relative', marginBottom: '4rem' }}>
                            <div style={{ position: 'absolute', inset: 0, background: '#22c55e', filter: 'blur(50px)', opacity: 0.15 }}></div>
                            <div className="glass flex flex-col items-center" style={{ padding: '4rem', borderRadius: '50px', border: '1px solid rgba(34,197,94,0.2)', position: 'relative' }}>
                                <svg style={{ width: '6rem', height: '6rem', color: '#22c55e', marginBottom: '2rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
                                <h2 style={{ fontSize: '4rem', fontWeight: 950, fontStyle: 'italic', letterSpacing: '-0.05em' }}>COMPLETE</h2>
                                <p style={{ fontSize: '11px', fontFamily: 'monospace', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.3em', fontWeight: 950 }}>Match QM {selectedMatchData?.matchNumber} • Team {formData.team.replace('frc', '')}</p>
                            </div>
                        </div>

                        <div className="w-full" style={{ display: 'grid', gap: '1.5rem' }}>
                            <button
                                onClick={async () => {
                                    const res = await saveScoutReport(formData);
                                    if (res.success) {
                                        alert('Mission Transmitted. Data Secured.');
                                        window.location.href = '/';
                                    } else {
                                        alert('Protocol Failure: ' + res.error);
                                    }
                                }}
                                className="btn-primary"
                                style={{ background: 'linear-gradient(90deg, #22c55e, #10b981)', color: '#000', padding: '2.5rem', fontSize: '2rem', borderRadius: '35px', fontWeight: 950 }}
                            >TRANSMIT DATA</button>
                            <button onClick={() => setStep('teleop')} style={{ background: 'none', border: 'none', color: '#888', fontWeight: 950, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.15em', cursor: 'pointer' }}>RE-VERIFY SENSORS</button>
                        </div>
                    </div>
                )}

            </div>
        </main>
    );
}
