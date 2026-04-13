'use client';

import { useState, useMemo, memo } from 'react';
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
    eventKey: string;
}

interface FormData {
    match: string;
    team: string;
    scouter: string;
    auto: { fuel: number; towerLevel: 'No Attempt' | 'Level1'; moved: boolean };
    tele: { fuel: number; towerLevel: 'No Attempt' | 'Level1' | 'Level2' | 'Level3' };
    defender_rating: number;
    hub_control: 'Dominant' | 'Average' | 'Weak';
    trench_capable: boolean;
    mech_failure: boolean;
    notes: string;
}

function Counter({ label, value, color, onChange }: { label: string; value: number; color: string; onChange: (v: number) => void }) {
    return (
        <div className="glass flex items-center justify-between" style={{ padding: '1.5rem', marginBottom: '1rem', borderLeft: `8px solid ${color}`, borderRadius: '25px', background: `linear-gradient(135deg, ${color}12 0%, transparent 100%)`, boxShadow: `0 8px 20px ${color}20` }}>
            <div style={{ flex: 1 }}>
                <span style={{ fontSize: '11px', fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.15em', color: color, marginBottom: '0.5rem', display: 'block' }}>{label}</span>
                <span style={{ fontSize: 'clamp(2.8rem, 10vw, 4rem)', fontWeight: 950, fontStyle: 'italic', letterSpacing: '-0.05em', lineHeight: 1, color: '#fff', textShadow: `0 0 15px ${color}30` }}>{value}</span>
            </div>
            <div className="flex" style={{ gap: '0.75rem' }}>
                <button onClick={() => onChange(Math.max(0, value - 1))} style={{ width: '4rem', height: '4rem', borderRadius: '15px', background: `${color}20`, border: `2px solid ${color}`, color: color, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 950, fontSize: '1.5rem', transition: 'all 0.3s ease', willChange: 'background' }} onMouseEnter={(e) => { e.currentTarget.style.background = `${color}30`; e.currentTarget.style.boxShadow = `0 0 15px ${color}40`; }} onMouseLeave={(e) => { e.currentTarget.style.background = `${color}20`; e.currentTarget.style.boxShadow = 'none'; }}>
                    <svg style={{ width: '1.75rem', height: '1.75rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M20 12H4" /></svg>
                </button>
                <button onClick={() => onChange(value + 1)} style={{ width: '4rem', height: '4rem', borderRadius: '15px', background: `${color}20`, border: `2px solid ${color}`, color: color, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 950, fontSize: '1.5rem', transition: 'all 0.3s ease', willChange: 'background' }} onMouseEnter={(e) => { e.currentTarget.style.background = `${color}30`; e.currentTarget.style.boxShadow = `0 0 15px ${color}40`; }} onMouseLeave={(e) => { e.currentTarget.style.background = `${color}20`; e.currentTarget.style.boxShadow = 'none'; }}>
                    <svg style={{ width: '1.75rem', height: '1.75rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M12 4v16m8-8H4" /></svg>
                </button>
            </div>
        </div>
    );
}

// Memoize Counter to prevent re-renders when props don't change
const MemoCounter = memo(Counter);

export default function ScoutForm({ initialSchedule, initialScouters, eventKey }: ScoutFormProps) {
    const [step, setStep] = useState<'info' | 'auto' | 'teleop' | 'submit'>('info');
    const [scouters, setScouters] = useState(initialScouters);
    const [formData, setFormData] = useState<FormData>({
        match: '', team: '', scouter: '',
        auto: { fuel: 0, towerLevel: 'No Attempt', moved: false },
        tele: { fuel: 0, towerLevel: 'No Attempt' },
        defender_rating: 3, hub_control: 'Average', trench_capable: false, mech_failure: false, notes: '',
    });

    const selectedMatchData = useMemo(() => initialSchedule.find(m => m.key === formData.match), [formData.match, initialSchedule]);

    const availableTeams = useMemo(() => {
        if (!selectedMatchData) return [];
        return [
            ...selectedMatchData.red.map(t => ({ key: t, color: '#ef4444', label: `RED: ${t.replace('frc', '')}` })),
            ...selectedMatchData.blue.map(t => ({ key: t, color: '#3b82f6', label: `BLUE: ${t.replace('frc', '')}` }))
        ];
    }, [selectedMatchData]);

    return (
        <main style={{ minHeight: '100vh', background: '#000', color: '#fff', padding: '2rem 1.5rem 8rem 1.5rem' }}>
            <div className="mx-auto" style={{ maxWidth: '500px' }}>
                <header className="flex items-center justify-between reveal" style={{ marginBottom: '3rem' }}>
                    <Link href="/" style={{ width: '3.5rem', height: '3.5rem', borderRadius: '15px', background: 'rgba(0,204,204,0.15)', border: '2px solid var(--primary-teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', transition: 'all 0.3s ease' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,204,204,0.25)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(0,204,204,0.3)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,204,204,0.15)'; e.currentTarget.style.boxShadow = 'none'; }}>
                        <svg style={{ width: '1.75rem', height: '1.75rem', color: 'var(--primary-teal)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </Link>
                    <div className="text-center">
                        <h1 style={{ fontSize: '1.25rem', fontWeight: 950, letterSpacing: '0.2em', textTransform: 'uppercase', background: 'linear-gradient(135deg, var(--primary-teal) 0%, var(--primary-brown) 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent' }}>⚡ Match Scout</h1>
                        <p style={{ fontSize: '10px', color: 'var(--primary-teal)', fontWeight: 900, marginTop: '0.35rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{eventKey.toUpperCase()}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.6rem' }}>
                        {(['info','auto','teleop','submit'] as const).map((s,i) => (
                            <div key={s} style={{ width:'0.65rem', height:'0.65rem', borderRadius:'50%', background: step===s ? 'var(--primary-teal)' : i < (['info','auto','teleop','submit'] as const).indexOf(step) ? 'var(--secondary-blue)' : 'rgba(255,255,255,0.1)', boxShadow: step===s ? '0 0 10px var(--primary-teal)' : 'none', transition: 'all 0.3s ease' }} />
                        ))}
                    </div>
                </header>

                {step === 'info' && (
                    <div className="reveal" style={{ display: 'grid', gap: '1.5rem' }}>
                        <div>
                            <h2 style={{ fontSize: '3.5rem', fontWeight: 950, fontStyle: 'italic', letterSpacing: '-0.05em', background: 'linear-gradient(135deg, var(--primary-teal) 0%, var(--primary-brown) 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent', lineHeight: 0.95 }}>Scout<span style={{ color: 'var(--secondary-red)', WebkitTextFillColor: 'initial' }}>Setup</span></h2>
                            <p style={{ color: '#888', fontSize: '12px', fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: '0.75rem' }}>⚙ Choose match, team, and scouter</p>
                        </div>
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            <div className="glass" style={{ padding: '1.75rem', borderRadius: '25px', borderLeft: '6px solid var(--primary-teal)' }}>
                                <p style={{ fontSize: '12px', fontWeight: 950, color: 'var(--primary-teal)', textTransform: 'uppercase', marginBottom: '0.85rem', letterSpacing: '0.15em' }}>📊 Match</p>
                                <select style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: 'clamp(1.75rem, 8vw, 2rem)', fontWeight: 950, outline: 'none', cursor: 'pointer', fontStyle: 'italic' }} value={formData.match} onChange={e => setFormData({ ...formData, match: e.target.value, team: '' })}>
                                    <option value="" style={{ background: '#000' }}>Select a match</option>
                                    {initialSchedule.map(m => <option key={m.key} value={m.key} style={{ background: '#000' }}>QM {m.matchNumber}</option>)}
                                </select>
                            </div>
                            <div className="glass" style={{ padding: '1.5rem', borderRadius: '25px', opacity: formData.match ? 1 : 0.3 }}>
                                <p style={{ fontSize: '11px', fontWeight: 950, color: '#fff', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.1em' }}>Team</p>
                                <select disabled={!formData.match} style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '2rem', fontWeight: 950, outline: 'none', cursor: 'pointer', fontStyle: 'italic' }} value={formData.team} onChange={e => setFormData({ ...formData, team: e.target.value })}>
                                    <option value="" style={{ background: '#000' }}>Select a team</option>
                                    {availableTeams.map(t => <option key={t.key} value={t.key} style={{ background: '#000', color: t.color }}>{t.label}</option>)}
                                </select>
                            </div>
                            <div className="glass" style={{ padding: '1.5rem', borderRadius: '25px' }}>
                                <p style={{ fontSize: '11px', fontWeight: 950, color: '#fff', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.1em' }}>Scouter</p>
                                <select style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '2rem', fontWeight: 950, outline: 'none', cursor: 'pointer', fontStyle: 'italic' }} value={formData.scouter} onChange={e => setFormData({ ...formData, scouter: e.target.value })}>
                                    <option value="" style={{ background: '#000' }}>Select your name</option>
                                    {scouters.map(s => <option key={s} value={s} style={{ background: '#000' }}>{s}</option>)}
                                    <option value="NEW" style={{ background: '#000' }}>+ Add new scouter...</option>
                                </select>
                                {formData.scouter === 'NEW' && (
                                    <input type="text" placeholder="Enter scouter name" autoFocus style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: 'none', borderBottom: '2px solid var(--primary)', color: '#fff', marginTop: '1.5rem', padding: '1rem', outline: 'none', fontSize: '1.25rem', fontWeight: 900 }}
                                        onKeyDown={e => { if (e.key === 'Enter') { const n = (e.currentTarget as HTMLInputElement).value; if (n) { setScouters([...scouters, n]); setFormData({ ...formData, scouter: n }); }}}}
                                        onBlur={e => { const n = e.target.value; if (n) { setScouters([...scouters, n]); setFormData({ ...formData, scouter: n }); }}}
                                    />
                                )}
                            </div>
                        </div>
                        <button onClick={() => setStep('auto')} disabled={!formData.match || !formData.team || !formData.scouter || formData.scouter === 'NEW'} className="btn-primary" style={{ opacity: (!formData.match || !formData.team || !formData.scouter || formData.scouter === 'NEW') ? 0.3 : 1 }}>Continue to auto</button>
                    </div>
                )}

                {step === 'auto' && (
                    <div className="reveal" style={{ display: 'grid', gap: '2rem' }}>
                        <div>
                            <h2 style={{ fontSize: '3.5rem', fontWeight: 950, fontStyle: 'italic', letterSpacing: '-0.05em', color: '#eab308', lineHeight: 0.9 }}>Auto<span style={{ color: '#fff' }}>Period</span></h2>
                            <p style={{ color: '#fff', fontSize: '12px', fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: '0.5rem' }}>Match {selectedMatchData?.matchNumber} • Team {formData.team.replace('frc','')}</p>
                        </div>
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            <Counter label="FUEL Scored in Hub" value={formData.auto.fuel} color="#a855f7" onChange={v => setFormData({ ...formData, auto: { ...formData.auto, fuel: v } })} />
                        </div>
                        <div className="glass" style={{ padding: '2rem', borderRadius: '30px' }}>
                            <p style={{ fontSize: '11px', fontWeight: 950, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '1.5rem' }}>Auto Climb</p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                                {(['No Attempt', 'Level1'] as const).map(level => (
                                    <button key={level} onClick={() => setFormData({ ...formData, auto: { ...formData.auto, towerLevel: level } })} style={{ padding: '1.5rem', borderRadius: '15px', border: '2px solid', fontSize: '12px', fontWeight: 950, fontStyle: 'italic', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.3s', background: formData.auto.towerLevel === level ? '#eab308' : 'rgba(255,255,255,0.05)', borderColor: formData.auto.towerLevel === level ? '#eab308' : 'rgba(255,255,255,0.05)', color: formData.auto.towerLevel === level ? '#000' : '#888' }}>
                                        {level === 'No Attempt' ? 'No Attempt' : 'Level 1 (15pts)'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button onClick={() => setFormData({ ...formData, auto: { ...formData.auto, moved: !formData.auto.moved } })} style={{ padding: '2rem', borderRadius: '25px', border: '3px solid', transition: 'all 0.3s', fontWeight: 950, fontStyle: 'italic', cursor: 'pointer', background: formData.auto.moved ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)', borderColor: formData.auto.moved ? '#22c55e' : 'rgba(255,255,255,0.1)', color: formData.auto.moved ? '#22c55e' : '#888', fontSize: '1.25rem' }}>
                            {formData.auto.moved ? 'Moved in auto' : 'Did not move in auto'}
                        </button>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1rem' }}>
                            <button onClick={() => setStep('info')} style={{ padding: '1.5rem', borderRadius: '25px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontWeight: 900, cursor: 'pointer' }}>Back</button>
                            <button onClick={() => setStep('teleop')} className="btn-primary" style={{ padding: '1.5rem', fontSize: '1.25rem' }}>Continue to teleop</button>
                        </div>
                    </div>
                )}

                {step === 'teleop' && (
                    <div className="reveal" style={{ display: 'grid', gap: '2rem' }}>
                        <div>
                            <h2 style={{ fontSize: '3.5rem', fontWeight: 950, fontStyle: 'italic', letterSpacing: '-0.05em', color: 'var(--secondary)', lineHeight: 0.9 }}>Tele<span style={{ color: '#fff' }}>op</span></h2>
                            <p style={{ color: '#fff', fontSize: '12px', fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: '0.5rem' }}>Match {selectedMatchData?.matchNumber} • Team {formData.team.replace('frc','')}</p>
                        </div>
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            <Counter label="FUEL Scored in Hub" value={formData.tele.fuel} color="var(--secondary)" onChange={v => setFormData({ ...formData, tele: { ...formData.tele, fuel: v } })} />
                            <Counter label="Defender Rating (1-5)" value={formData.defender_rating} color="#94a3b8" onChange={v => setFormData({ ...formData, defender_rating: Math.min(5, Math.max(1, v)) })} />
                        </div>
                        <div className="glass" style={{ padding: '2rem', borderRadius: '30px' }}>
                            <p style={{ fontSize: '11px', fontWeight: 950, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '1.5rem' }}>Hub control</p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                                {(['Dominant', 'Average', 'Weak'] as const).map(ctrl => (
                                    <button key={ctrl} onClick={() => setFormData({ ...formData, hub_control: ctrl })} style={{ padding: '1.25rem', borderRadius: '15px', border: '2px solid', fontSize: '12px', fontWeight: 950, fontStyle: 'italic', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.3s', background: formData.hub_control === ctrl ? 'var(--primary)' : 'rgba(255,255,255,0.05)', borderColor: formData.hub_control === ctrl ? 'var(--primary)' : 'rgba(255,255,255,0.05)', color: formData.hub_control === ctrl ? '#000' : '#888' }}>{ctrl}</button>
                                ))}
                            </div>
                        </div>
                        <div className="glass" style={{ padding: '2rem', borderRadius: '30px' }}>
                            <p style={{ fontSize: '11px', fontWeight: 950, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '1.5rem' }}>Endgame climb level</p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                {(['No Attempt', 'Level1', 'Level2', 'Level3'] as const).map(level => (
                                    <button key={level} onClick={() => setFormData({ ...formData, tele: { ...formData.tele, towerLevel: level } })} style={{ padding: '1.5rem', borderRadius: '15px', border: '1px solid', fontSize: '12px', fontWeight: 950, fontStyle: 'italic', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.3s', background: formData.tele.towerLevel === level ? 'var(--secondary)' : 'rgba(255,255,255,0.05)', borderColor: formData.tele.towerLevel === level ? 'var(--secondary)' : 'rgba(255,255,255,0.05)', color: formData.tele.towerLevel === level ? '#000' : '#888' }}>
                                        {level === 'No Attempt' ? 'No Attempt' : level === 'Level1' ? 'L1 (10pts)' : level === 'Level2' ? 'L2 (20pts)' : 'L3 (30pts)'}
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => setFormData({ ...formData, trench_capable: !formData.trench_capable })} style={{ width: '100%', padding: '1rem', borderRadius: '15px', border: '2px solid', transition: 'all 0.3s', fontWeight: 950, fontSize: '12px', cursor: 'pointer', background: formData.trench_capable ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)', borderColor: formData.trench_capable ? '#22c55e' : 'rgba(255,255,255,0.1)', color: formData.trench_capable ? '#22c55e' : '#888' }}>
                                {formData.trench_capable ? 'Can drive under trench' : 'Cannot drive under trench'}
                            </button>
                        </div>
                        <div className="glass" style={{ padding: '2rem', borderRadius: '30px' }}>
                            <p style={{ fontSize: '11px', fontWeight: 950, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '1rem' }}>Notes</p>
                            <textarea placeholder="Add useful observations for strategy (driver habits, defense, reliability, etc.)" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} style={{ width: '100%', minHeight: '120px', background: 'rgba(255,255,255,0.03)', border: '2px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '1.25rem', color: '#fff', fontSize: '1rem', outline: 'none', resize: 'none' }} />
                            <div style={{ marginTop: '1rem' }}>
                                <button onClick={() => setFormData({ ...formData, mech_failure: !formData.mech_failure })} style={{ padding: '0.75rem 1.5rem', borderRadius: '15px', background: formData.mech_failure ? '#ef4444' : 'rgba(239,68,68,0.1)', color: formData.mech_failure ? '#000' : '#ef4444', border: 'none', fontWeight: 950, fontSize: '11px', textTransform: 'uppercase', cursor: 'pointer' }}>
                                    {formData.mech_failure ? 'Mechanical issue reported' : 'No mechanical issues'}
                                </button>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1rem' }}>
                            <button onClick={() => setStep('auto')} style={{ padding: '1.5rem', borderRadius: '25px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontWeight: 900, cursor: 'pointer' }}>Back</button>
                            <button onClick={() => setStep('submit')} className="btn-primary" style={{ background: '#22c55e', color: '#000', padding: '1.5rem', fontSize: '1.25rem' }}>Review report</button>
                        </div>
                    </div>
                )}

                {step === 'submit' && (
                    <div className="reveal flex flex-col items-center" style={{ marginTop: '3rem' }}>
                        <div style={{ position: 'relative', marginBottom: '4rem' }}>
                            <div style={{ position: 'absolute', inset: 0, background: '#22c55e', filter: 'blur(50px)', opacity: 0.15 }}></div>
                            <div className="glass flex flex-col items-center" style={{ padding: '4rem', borderRadius: '50px', border: '1px solid rgba(34,197,94,0.2)', position: 'relative' }}>
                                <svg style={{ width: '6rem', height: '6rem', color: '#22c55e', marginBottom: '2rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
                                <h2 style={{ fontSize: '4rem', fontWeight: 950, fontStyle: 'italic', letterSpacing: '-0.05em' }}>Ready</h2>
                                <p style={{ fontSize: '11px', fontFamily: 'monospace', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.3em', fontWeight: 950 }}>QM {selectedMatchData?.matchNumber} • Team {formData.team.replace('frc','')}</p>
                            </div>
                        </div>
                        <div className="w-full" style={{ display: 'grid', gap: '1.5rem' }}>
                            <button onClick={async () => {
                                const res = await saveScoutReport({ ...formData, eventKey });
                                if (res.success) { alert('Scout report saved.'); window.location.href = '/'; }
                                else { alert('Could not save report: ' + res.error); }
                            }} className="btn-primary" style={{ background: 'linear-gradient(90deg, #22c55e, #10b981)', color: '#000', padding: '2.5rem', fontSize: '2rem', borderRadius: '35px', fontWeight: 950 }}>Save scout report</button>
                            <button onClick={() => setStep('teleop')} style={{ background: 'none', border: 'none', color: '#888', fontWeight: 950, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.15em', cursor: 'pointer' }}>Back to teleop</button>
                        </div>
                    </div>
                )}

            </div>
        </main>
    );
}
