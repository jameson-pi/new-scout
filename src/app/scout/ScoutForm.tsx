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
        <div className="glass flex items-center justify-between" style={{ padding: '1.25rem', marginBottom: '0.75rem', borderLeft: `6px solid ${color}`, borderRadius: '25px' }}>
            <div style={{ flex: 1 }}>
                <span style={{ fontSize: '10px', fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#fff', marginBottom: '0.25rem', display: 'block' }}>{label}</span>
                <span style={{ fontSize: 'clamp(2.5rem, 8vw, 3.5rem)', fontWeight: 950, fontStyle: 'italic', letterSpacing: '-0.05em', lineHeight: 1 }}>{value}</span>
            </div>
            <div className="flex" style={{ gap: '0.75rem' }}>
                <button onClick={() => onChange(Math.max(0, value - 1))} style={{ width: '3.5rem', height: '3.5rem', borderRadius: '15px', background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg style={{ width: '1.5rem', height: '1.5rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M20 12H4" /></svg>
                </button>
                <button onClick={() => onChange(value + 1)} style={{ width: '3.5rem', height: '3.5rem', borderRadius: '15px', background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg style={{ width: '1.5rem', height: '1.5rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M12 4v16m8-8H4" /></svg>
                </button>
            </div>
        </div>
    );
}

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
                    <Link href="/" style={{ width: '3rem', height: '3rem', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                        <svg style={{ width: '1.5rem', height: '1.5rem', color: '#fff' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </Link>
                    <div className="text-center">
                        <h1 style={{ fontSize: '0.875rem', fontWeight: 950, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--primary)' }}>MISSION INTEL</h1>
                        <p style={{ fontSize: '0.75rem', color: '#666', fontWeight: 700, marginTop: '0.25rem' }}>{eventKey.toUpperCase()}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {(['info','auto','teleop','submit'] as const).map((s,i) => (
                            <div key={s} style={{ width:'0.5rem', height:'0.5rem', borderRadius:'50%', background: step===s ? 'var(--primary)' : i < (['info','auto','teleop','submit'] as const).indexOf(step) ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.1)' }} />
                        ))}
                    </div>
                </header>

                {step === 'info' && (
                    <div className="reveal" style={{ display: 'grid', gap: '1.5rem' }}>
                        <div>
                            <h2 style={{ fontSize: '4rem', fontWeight: 950, fontStyle: 'italic', letterSpacing: '-0.05em', color: 'var(--primary)', lineHeight: 0.9 }}>UNIT<span style={{ color: '#fff' }}>ID</span></h2>
                            <p style={{ color: '#888', fontSize: '12px', fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: '0.5rem' }}>Mission Parameters</p>
                        </div>
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            <div className="glass" style={{ padding: '1.5rem', borderRadius: '25px' }}>
                                <p style={{ fontSize: '11px', fontWeight: 950, color: '#fff', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.1em' }}>SELECT MATCH</p>
                                <select style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '2rem', fontWeight: 950, outline: 'none', cursor: 'pointer', fontStyle: 'italic' }} value={formData.match} onChange={e => setFormData({ ...formData, match: e.target.value, team: '' })}>
                                    <option value="" style={{ background: '#000' }}>-- CHOOSE MATCH --</option>
                                    {initialSchedule.map(m => <option key={m.key} value={m.key} style={{ background: '#000' }}>QM {m.matchNumber}</option>)}
                                </select>
                            </div>
                            <div className="glass" style={{ padding: '1.5rem', borderRadius: '25px', opacity: formData.match ? 1 : 0.3 }}>
                                <p style={{ fontSize: '11px', fontWeight: 950, color: '#fff', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.1em' }}>SELECT TEAM</p>
                                <select disabled={!formData.match} style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '2rem', fontWeight: 950, outline: 'none', cursor: 'pointer', fontStyle: 'italic' }} value={formData.team} onChange={e => setFormData({ ...formData, team: e.target.value })}>
                                    <option value="" style={{ background: '#000' }}>-- CHOOSE TEAM --</option>
                                    {availableTeams.map(t => <option key={t.key} value={t.key} style={{ background: '#000', color: t.color }}>{t.label}</option>)}
                                </select>
                            </div>
                            <div className="glass" style={{ padding: '1.5rem', borderRadius: '25px' }}>
                                <p style={{ fontSize: '11px', fontWeight: 950, color: '#fff', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.1em' }}>SCOUTER IDENTITY</p>
                                <select style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '2rem', fontWeight: 950, outline: 'none', cursor: 'pointer', fontStyle: 'italic' }} value={formData.scouter} onChange={e => setFormData({ ...formData, scouter: e.target.value })}>
                                    <option value="" style={{ background: '#000' }}>-- IDENTITY REQUIRED --</option>
                                    {scouters.map(s => <option key={s} value={s} style={{ background: '#000' }}>{s}</option>)}
                                    <option value="NEW" style={{ background: '#000' }}>+ Register New...</option>
                                </select>
                                {formData.scouter === 'NEW' && (
                                    <input type="text" placeholder="Enter Name" autoFocus style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: 'none', borderBottom: '2px solid var(--primary)', color: '#fff', marginTop: '1.5rem', padding: '1rem', outline: 'none', fontSize: '1.25rem', fontWeight: 900 }}
                                        onKeyDown={e => { if (e.key === 'Enter') { const n = (e.currentTarget as HTMLInputElement).value; if (n) { setScouters([...scouters, n]); setFormData({ ...formData, scouter: n }); }}}}
                                        onBlur={e => { const n = e.target.value; if (n) { setScouters([...scouters, n]); setFormData({ ...formData, scouter: n }); }}}
                                    />
                                )}
                            </div>
                        </div>
                        <button onClick={() => setStep('auto')} disabled={!formData.match || !formData.team || !formData.scouter || formData.scouter === 'NEW'} className="btn-primary" style={{ opacity: (!formData.match || !formData.team || !formData.scouter || formData.scouter === 'NEW') ? 0.3 : 1 }}>INITIALIZE SCANS</button>
                    </div>
                )}

                {step === 'auto' && (
                    <div className="reveal" style={{ display: 'grid', gap: '2rem' }}>
                        <div>
                            <h2 style={{ fontSize: '3.5rem', fontWeight: 950, fontStyle: 'italic', letterSpacing: '-0.05em', color: '#eab308', lineHeight: 0.9 }}>AUTO<span style={{ color: '#fff' }}>NOMOUS</span></h2>
                            <p style={{ color: '#fff', fontSize: '12px', fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: '0.5rem' }}>Sensor Evaluation • QM {selectedMatchData?.matchNumber} • {formData.team.replace('frc','')}</p>
                        </div>
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            <Counter label="FUEL Scored in Hub" value={formData.auto.fuel} color="#a855f7" onChange={v => setFormData({ ...formData, auto: { ...formData.auto, fuel: v } })} />
                        </div>
                        <div className="glass" style={{ padding: '2rem', borderRadius: '30px' }}>
                            <p style={{ fontSize: '11px', fontWeight: 950, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '1.5rem' }}>Auto Tower</p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                                {(['No Attempt', 'Level1'] as const).map(level => (
                                    <button key={level} onClick={() => setFormData({ ...formData, auto: { ...formData.auto, towerLevel: level } })} style={{ padding: '1.5rem', borderRadius: '15px', border: '2px solid', fontSize: '12px', fontWeight: 950, fontStyle: 'italic', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.3s', background: formData.auto.towerLevel === level ? '#eab308' : 'rgba(255,255,255,0.05)', borderColor: formData.auto.towerLevel === level ? '#eab308' : 'rgba(255,255,255,0.05)', color: formData.auto.towerLevel === level ? '#000' : '#888' }}>
                                        {level === 'No Attempt' ? 'No Attempt' : 'Level 1 (15pts)'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button onClick={() => setFormData({ ...formData, auto: { ...formData.auto, moved: !formData.auto.moved } })} style={{ padding: '2rem', borderRadius: '25px', border: '3px solid', transition: 'all 0.3s', fontWeight: 950, fontStyle: 'italic', cursor: 'pointer', background: formData.auto.moved ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)', borderColor: formData.auto.moved ? '#22c55e' : 'rgba(255,255,255,0.1)', color: formData.auto.moved ? '#22c55e' : '#888', fontSize: '1.25rem' }}>
                            {formData.auto.moved ? '● ROBOT MOBILIZED' : '○ MOBILITY PENDING'}
                        </button>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1rem' }}>
                            <button onClick={() => setStep('info')} style={{ padding: '1.5rem', borderRadius: '25px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontWeight: 900, cursor: 'pointer' }}>BACK</button>
                            <button onClick={() => setStep('teleop')} className="btn-primary" style={{ padding: '1.5rem', fontSize: '1.25rem' }}>TELEOP NEXT</button>
                        </div>
                    </div>
                )}

                {step === 'teleop' && (
                    <div className="reveal" style={{ display: 'grid', gap: '2rem' }}>
                        <div>
                            <h2 style={{ fontSize: '3.5rem', fontWeight: 950, fontStyle: 'italic', letterSpacing: '-0.05em', color: 'var(--secondary)', lineHeight: 0.9 }}>TELE<span style={{ color: '#fff' }}>OPERATED</span></h2>
                            <p style={{ color: '#fff', fontSize: '12px', fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: '0.5rem' }}>Performance Metrics • QM {selectedMatchData?.matchNumber} • {formData.team.replace('frc','')}</p>
                        </div>
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            <Counter label="FUEL Scored in Hub" value={formData.tele.fuel} color="var(--secondary)" onChange={v => setFormData({ ...formData, tele: { ...formData.tele, fuel: v } })} />
                            <Counter label="Defender Rating (1-5)" value={formData.defender_rating} color="#94a3b8" onChange={v => setFormData({ ...formData, defender_rating: Math.min(5, Math.max(1, v)) })} />
                        </div>
                        <div className="glass" style={{ padding: '2rem', borderRadius: '30px' }}>
                            <p style={{ fontSize: '11px', fontWeight: 950, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '1.5rem' }}>Hub Control Rating</p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                                {(['Dominant', 'Average', 'Weak'] as const).map(ctrl => (
                                    <button key={ctrl} onClick={() => setFormData({ ...formData, hub_control: ctrl })} style={{ padding: '1.25rem', borderRadius: '15px', border: '2px solid', fontSize: '12px', fontWeight: 950, fontStyle: 'italic', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.3s', background: formData.hub_control === ctrl ? 'var(--primary)' : 'rgba(255,255,255,0.05)', borderColor: formData.hub_control === ctrl ? 'var(--primary)' : 'rgba(255,255,255,0.05)', color: formData.hub_control === ctrl ? '#000' : '#888' }}>{ctrl}</button>
                                ))}
                            </div>
                        </div>
                        <div className="glass" style={{ padding: '2rem', borderRadius: '30px' }}>
                            <p style={{ fontSize: '11px', fontWeight: 950, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '1.5rem' }}>Mission Endgame — Tower Level</p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                {(['No Attempt', 'Level1', 'Level2', 'Level3'] as const).map(level => (
                                    <button key={level} onClick={() => setFormData({ ...formData, tele: { ...formData.tele, towerLevel: level } })} style={{ padding: '1.5rem', borderRadius: '15px', border: '1px solid', fontSize: '12px', fontWeight: 950, fontStyle: 'italic', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.3s', background: formData.tele.towerLevel === level ? 'var(--secondary)' : 'rgba(255,255,255,0.05)', borderColor: formData.tele.towerLevel === level ? 'var(--secondary)' : 'rgba(255,255,255,0.05)', color: formData.tele.towerLevel === level ? '#000' : '#888' }}>
                                        {level === 'No Attempt' ? 'No Attempt' : level === 'Level1' ? 'L1 (10pts)' : level === 'Level2' ? 'L2 (20pts)' : 'L3 (30pts)'}
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => setFormData({ ...formData, trench_capable: !formData.trench_capable })} style={{ width: '100%', padding: '1rem', borderRadius: '15px', border: '2px solid', transition: 'all 0.3s', fontWeight: 950, fontSize: '12px', cursor: 'pointer', background: formData.trench_capable ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)', borderColor: formData.trench_capable ? '#22c55e' : 'rgba(255,255,255,0.1)', color: formData.trench_capable ? '#22c55e' : '#888' }}>
                                {formData.trench_capable ? '● TRENCH CAPABLE' : '○ TRENCH NOT TESTED'}
                            </button>
                        </div>
                        <div className="glass" style={{ padding: '2rem', borderRadius: '30px' }}>
                            <p style={{ fontSize: '11px', fontWeight: 950, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '1rem' }}>Field Intelligence (Notes)</p>
                            <textarea placeholder="Report mechanical issues, driver quirks, hub shift timing, or tactical observations..." value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} style={{ width: '100%', minHeight: '120px', background: 'rgba(255,255,255,0.03)', border: '2px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '1.25rem', color: '#fff', fontSize: '1rem', outline: 'none', resize: 'none' }} />
                            <div style={{ marginTop: '1rem' }}>
                                <button onClick={() => setFormData({ ...formData, mech_failure: !formData.mech_failure })} style={{ padding: '0.75rem 1.5rem', borderRadius: '15px', background: formData.mech_failure ? '#ef4444' : 'rgba(239,68,68,0.1)', color: formData.mech_failure ? '#000' : '#ef4444', border: 'none', fontWeight: 950, fontSize: '11px', textTransform: 'uppercase', cursor: 'pointer' }}>
                                    {formData.mech_failure ? '● MECH FAILURE LOGGED' : '○ NO MECHANICAL ISSUES'}
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
                                <p style={{ fontSize: '11px', fontFamily: 'monospace', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.3em', fontWeight: 950 }}>QM {selectedMatchData?.matchNumber} • Team {formData.team.replace('frc','')}</p>
                            </div>
                        </div>
                        <div className="w-full" style={{ display: 'grid', gap: '1.5rem' }}>
                            <button onClick={async () => {
                                const res = await saveScoutReport({ ...formData, eventKey });
                                if (res.success) { alert('Mission Transmitted. Data Secured.'); window.location.href = '/'; }
                                else { alert('Protocol Failure: ' + res.error); }
                            }} className="btn-primary" style={{ background: 'linear-gradient(90deg, #22c55e, #10b981)', color: '#000', padding: '2.5rem', fontSize: '2rem', borderRadius: '35px', fontWeight: 950 }}>TRANSMIT DATA</button>
                            <button onClick={() => setStep('teleop')} style={{ background: 'none', border: 'none', color: '#888', fontWeight: 950, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.15em', cursor: 'pointer' }}>RE-VERIFY SENSORS</button>
                        </div>
                    </div>
                )}

            </div>
        </main>
    );
}
