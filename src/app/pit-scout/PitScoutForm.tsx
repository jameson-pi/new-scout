'use client';

import { useState, memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { savePitReport } from '@/lib/actions';

interface RosterTeam { teamKey: string; teamNum: number; name: string; }

interface Props {
    eventKey: string;
    roster: RosterTeam[];
    initialScouters: string[];
    preselectedTeam?: string;
}

type YesNo = 'Yes' | 'No' | '';

interface PitFormData {
    team: string;
    scouter: string;
    // Physical
    weight_lbs: string;
    height_in: string;
    width_in: string;
    length_in: string;
    // Drivetrain
    drivebase: string;
    code_language: string;
    // Climbing
    climb: string;
    climb_position_1: string;
    climb_position_2: string;
    climb_partners: string;
    auto_climb: YesNo;
    // Fuel / Hopper
    hopper_capacity: string;
    pickup_floor: YesNo;
    pickup_outpost: YesNo;
    // Field capabilities
    trench: YesNo;
    bump: YesNo;
    bump_practice: YesNo;
    can_lob: YesNo;
    can_doze: YesNo;
    shift_tracking: YesNo;
    turret: YesNo;
    // Auto
    auto_pref_start: string;
    auto_pref_pickup: YesNo;
    preferred_ds: string;
    // Scoring zones (shoot/lob positions)
    shoot_zones: string[];
    // Robot assessment
    kitbot: string;
    kitbot_modified: string;
    robot_quality: number;
    pit_quality: number;
    human_player: string;
    human_player_height: string;
    other_notes: string;
    robot_image_url: string;
}

const DRIVEBASE_OPTIONS = ['Swerve', 'Tank', 'Mecanum', 'West Coast', 'Other'];
const CODE_OPTIONS = ['Java', 'Python', 'C++', 'LabVIEW', 'Other'];
const CLIMB_OPTIONS = ['No Attempt', 'L1', 'L2', 'L3'];
const CLIMB_POS = ['Center', 'Wall Side', 'Edge', 'No Pref'];
const DS_OPTIONS = ['Red 1', 'Red 2', 'Red 3', 'Blue 1', 'Blue 2', 'Blue 3', 'No Pref'];
const AUTO_START = ['Center', 'Left', 'Right', 'No Pref'];
const SHOOT_ZONES = [
    'shoot_left_close', 'shoot_center_close', 'shoot_right_close',
    'shoot_left_far', 'shoot_center_far', 'shoot_right_far',
    'lob_left_close', 'lob_center_close', 'lob_right_close',
    'lob_left_far', 'lob_center_far', 'lob_right_far',
];

function ToggleButton({ label, value, onChange }: { label: string; value: YesNo; onChange: (v: YesNo) => void }) {
    return (
        <button
            type="button"
            onClick={() => onChange(value === 'Yes' ? 'No' : 'Yes')}
            style={{
                padding: '0.7rem 0.95rem', borderRadius: '10px', border: '1px solid', fontSize: '11px',
                fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s ease-out',
                background: value === 'Yes' ? 'rgba(132,202,167,0.14)' : 'rgba(255,255,255,0.03)',
                borderColor: value === 'Yes' ? '#84caa7' : 'rgba(255,255,255,0.12)',
                color: value === 'Yes' ? '#84caa7' : 'var(--muted)',
            }}
        >
            {value === 'Yes' ? 'Yes · ' : 'No · '}{label}
        </button>
    );
}

const MemoToggleButton = memo(ToggleButton);

function StarRating({ label, value, onChange, max = 5 }: { label: string; value: number; onChange: (v: number) => void; max?: number }) {
    return (
        <div>
            <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.06em' }}>{label}</p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                {Array.from({ length: max }, (_, i) => (
                    <button key={i} type="button" onClick={() => onChange(i + 1)}
                        style={{ width: '2.4rem', height: '2.4rem', borderRadius: '8px', border: '1px solid', fontSize: '1rem', cursor: 'pointer', transition: 'all 0.2s ease-out', background: i < value ? 'rgba(124,109,216,0.16)' : 'rgba(255,255,255,0.03)', borderColor: i < value ? 'rgba(124,109,216,0.55)' : 'rgba(255,255,255,0.12)', color: i < value ? 'var(--primary)' : 'var(--muted)' }}>
                        ★
                    </button>
                ))}
            </div>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="glass" style={{ padding: '1.75rem', borderRadius: '20px', display: 'grid', gap: '1.2rem', borderLeft: '6px solid var(--primary-teal)', background: 'linear-gradient(135deg, rgba(0,204,204,0.08) 0%, transparent 100%)' }}>
            <p style={{ fontSize: '11px', fontWeight: 950, color: 'var(--primary-teal)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.5rem' }}>⚙ {title}</p>
            {children}
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <p style={{ fontSize: '11px', fontWeight: 950, color: 'var(--primary-brown)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>{label}</p>
            {children}
        </div>
    );
}

const inputStyle: React.CSSProperties = { width: '100%', background: 'rgba(0,204,204,0.08)', border: '2px solid var(--primary-teal)', borderRadius: '12px', padding: '0.9rem 1.1rem', color: 'var(--foreground)', fontSize: '1rem', fontWeight: 700 };
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };

export default function PitScoutForm({ eventKey, roster, initialScouters, preselectedTeam }: Props) {
    const [scouters, setScouters] = useState(initialScouters);
    const [submitted, setSubmitted] = useState(false);
    const [submittedTeam, setSubmittedTeam] = useState('');

    const [form, setForm] = useState<PitFormData>({
        team: preselectedTeam || '',
        scouter: '',
        weight_lbs: '', height_in: '', width_in: '', length_in: '',
        drivebase: '', code_language: '',
        climb: 'No Attempt', climb_position_1: 'Center', climb_position_2: 'No Pref',
        climb_partners: '1', auto_climb: 'No',
        hopper_capacity: '', pickup_floor: 'No', pickup_outpost: 'No',
        trench: 'No', bump: 'No', bump_practice: 'No',
        can_lob: 'No', can_doze: 'No', shift_tracking: 'No', turret: 'No',
        auto_pref_start: 'No Pref', auto_pref_pickup: 'No', preferred_ds: 'No Pref',
        shoot_zones: [],
        kitbot: '', kitbot_modified: '',
        robot_quality: 3, pit_quality: 3,
        human_player: '', human_player_height: '', other_notes: '',
        robot_image_url: '',
    });

    const set = (key: keyof PitFormData, val: unknown) => setForm(f => ({ ...f, [key]: val }));
    const toggleZone = (zone: string) => setForm(f => ({
        ...f,
        shoot_zones: f.shoot_zones.includes(zone) ? f.shoot_zones.filter(z => z !== zone) : [...f.shoot_zones, zone],
    }));

    const selectedTeamName = roster.find(r => r.teamKey === form.team)?.name || '';

    const handleSubmit = async () => {
        if (!form.team || !form.scouter) return alert('Team and scouter are required.');
        const payload: Record<string, unknown> = {
            ...form,
            eventKey,
            // zones as Yes/No fields
            ...Object.fromEntries(SHOOT_ZONES.map(z => [z, form.shoot_zones.includes(z) ? 'Yes' : 'No'])),
        };
        const res = await savePitReport(payload);
        if (res.success) {
            setSubmittedTeam(form.team);
            setSubmitted(true);
        } else {
            alert('Save failed: ' + res.error);
        }
    };

    if (submitted) {
        return (
            <main style={{ minHeight: '100vh', background: 'var(--background)', color: 'var(--foreground)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', padding: '1.5rem' }}>
                <div className="glass" style={{ padding: '2.5rem', borderRadius: '28px', textAlign: 'center', border: '1px solid rgba(132,202,167,0.3)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>✅</div>
                    <h2 style={{ fontSize: '2rem', fontWeight: 760, letterSpacing: '-0.02em' }}>Pit Report Saved</h2>
                    <p style={{ color: 'var(--muted)', marginTop: '0.5rem' }}>Team {submittedTeam.replace('frc', '')} — {eventKey.toUpperCase()}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={() => { setSubmitted(false); setForm(f => ({ ...f, team: '' })); }} style={{ padding: '0.85rem 1.4rem', borderRadius: '14px', background: 'var(--primary)', color: '#1a1d22', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Scout Another</button>
                    <Link href={`/event/${eventKey}`} style={{ padding: '0.85rem 1.4rem', borderRadius: '14px', background: 'rgba(255,255,255,0.04)', color: 'var(--foreground)', border: '1px solid rgba(255,255,255,0.12)', fontWeight: 650, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>Back to Event</Link>
                </div>
            </main>
        );
    }

    return (
        <main style={{ minHeight: '100vh', background: 'var(--background)', color: 'var(--foreground)', padding: '1.5rem 1.25rem 6rem' }}>
            <div style={{ maxWidth: '560px', margin: '0 auto', display: 'grid', gap: '1.25rem' }}>
                {/* Header */}
                <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <Link href={`/event/${eventKey}`} style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em' }}>← Event</Link>
                    <div style={{ textAlign: 'center' }}>
                        <h1 style={{ fontSize: '0.95rem', fontWeight: 760, letterSpacing: '0.14em', color: 'var(--primary)' }}>Pit Scout</h1>
                        <p style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>{eventKey.toUpperCase()}</p>
                    </div>
                    <div style={{ width: '4rem' }} />
                </header>

                {/* Team + Scouter */}
                <Section title="Identity">
                    <Field label="Team">
                        <select style={selectStyle} value={form.team} onChange={e => set('team', e.target.value)}>
                            <option value="" style={{ background: '#000' }}>-- SELECT TEAM --</option>
                            {roster.map(r => (
                                <option key={r.teamKey} value={r.teamKey} style={{ background: '#000' }}>
                                    {r.teamNum} — {r.name}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Scouter">
                        <select style={selectStyle} value={form.scouter} onChange={e => set('scouter', e.target.value)}>
                            <option value="" style={{ background: '#000' }}>-- YOUR NAME --</option>
                            {scouters.map(s => <option key={s} value={s} style={{ background: '#000' }}>{s}</option>)}
                            <option value="__new__" style={{ background: '#000' }}>+ Add name...</option>
                        </select>
                        {form.scouter === '__new__' && (
                            <input type="text" placeholder="Enter your name" autoFocus style={{ ...inputStyle, marginTop: '0.5rem' }}
                                onBlur={e => { const n = e.target.value.trim(); if (n) { setScouters(s => [...s, n]); set('scouter', n); }}}
                                onKeyDown={e => { if (e.key === 'Enter') { const n = (e.currentTarget as HTMLInputElement).value.trim(); if (n) { setScouters(s => [...s, n]); set('scouter', n); }}}}
                            />
                        )}
                    </Field>
                </Section>

                {/* Physical */}
                <Section title="Physical Specs">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        {([['weight_lbs','Weight (lbs)'],['height_in','Height (in)'],['width_in','Width (in)'],['length_in','Length (in)']] as [keyof PitFormData, string][]).map(([key, label]) => (
                            <Field key={key} label={label}>
                                <input type="number" style={inputStyle} value={form[key] as string} placeholder="—"
                                    onChange={e => set(key, e.target.value)} />
                            </Field>
                        ))}
                    </div>
                </Section>

                {/* Drivetrain */}
                <Section title="Drivetrain & Code">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <Field label="Drivebase">
                            <select style={selectStyle} value={form.drivebase} onChange={e => set('drivebase', e.target.value)}>
                                <option value="" style={{ background: '#000' }}>--</option>
                                {DRIVEBASE_OPTIONS.map(o => <option key={o} value={o} style={{ background: '#000' }}>{o}</option>)}
                            </select>
                        </Field>
                        <Field label="Code Language">
                            <select style={selectStyle} value={form.code_language} onChange={e => set('code_language', e.target.value)}>
                                <option value="" style={{ background: '#000' }}>--</option>
                                {CODE_OPTIONS.map(o => <option key={o} value={o} style={{ background: '#000' }}>{o}</option>)}
                            </select>
                        </Field>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <ToggleButton label="Turret" value={form.turret as YesNo} onChange={v => set('turret', v)} />
                        <ToggleButton label="Shift Tracking" value={form.shift_tracking} onChange={v => set('shift_tracking', v)} />
                    </div>
                </Section>

                {/* Fuel / Pickup */}
                <Section title="Fuel & Pickup">
                    <Field label="Hopper Capacity (balls)">
                        <input type="number" style={inputStyle} value={form.hopper_capacity} placeholder="e.g. 15"
                            onChange={e => set('hopper_capacity', e.target.value)} />
                    </Field>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <ToggleButton label="Floor Pickup" value={form.pickup_floor} onChange={v => set('pickup_floor', v)} />
                        <ToggleButton label="Outpost Pickup" value={form.pickup_outpost} onChange={v => set('pickup_outpost', v)} />
                        <ToggleButton label="Can Lob" value={form.can_lob} onChange={v => set('can_lob', v)} />
                        <ToggleButton label="Can Doze" value={form.can_doze} onChange={v => set('can_doze', v)} />
                    </div>
                </Section>

                {/* Shooting Zones */}
                <Section title="Shooting Zones (tap all that apply)">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                        {SHOOT_ZONES.map(zone => {
                            const active = form.shoot_zones.includes(zone);
                            const label = zone.replace(/_/g, ' ').replace('shoot', '🎯').replace('lob', '🏹');
                            return (
                                <button key={zone} type="button" onClick={() => toggleZone(zone)}
                                    style={{ padding: '0.6rem', borderRadius: '10px', border: '2px solid', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s', background: active ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.03)', borderColor: active ? 'var(--secondary)' : 'rgba(255,255,255,0.08)', color: active ? 'var(--secondary)' : '#555' }}>
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </Section>

                {/* Climb */}
                <Section title="Tower Climb">
                    <Field label="Max Climb Level">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                            {CLIMB_OPTIONS.map(o => (
                                <button key={o} type="button" onClick={() => set('climb', o)} style={{ padding: '0.75rem', borderRadius: '10px', border: '2px solid', fontSize: '11px', fontWeight: 950, textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s', background: form.climb === o ? 'rgba(234,179,8,0.15)' : 'rgba(255,255,255,0.03)', borderColor: form.climb === o ? '#eab308' : 'rgba(255,255,255,0.08)', color: form.climb === o ? '#eab308' : '#666' }}>
                                    {o}
                                </button>
                            ))}
                        </div>
                    </Field>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <Field label="Position 1">
                            <select style={selectStyle} value={form.climb_position_1} onChange={e => set('climb_position_1', e.target.value)}>
                                {CLIMB_POS.map(o => <option key={o} value={o} style={{ background: '#000' }}>{o}</option>)}
                            </select>
                        </Field>
                        <Field label="Position 2">
                            <select style={selectStyle} value={form.climb_position_2} onChange={e => set('climb_position_2', e.target.value)}>
                                {CLIMB_POS.map(o => <option key={o} value={o} style={{ background: '#000' }}>{o}</option>)}
                            </select>
                        </Field>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <ToggleButton label="Auto Climb" value={form.auto_climb} onChange={v => set('auto_climb', v)} />
                        <div>
                            <p style={{ fontSize: '10px', color: '#666', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.3rem' }}>Climb Partners</p>
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                                {[0,1,2,3].map(n => (
                                    <button key={n} type="button" onClick={() => set('climb_partners', String(n))} style={{ width: '2.5rem', height: '2.5rem', borderRadius: '8px', border: '2px solid', fontWeight: 950, cursor: 'pointer', fontSize: '1rem', background: form.climb_partners === String(n) ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.03)', borderColor: form.climb_partners === String(n) ? '#8b5cf6' : 'rgba(255,255,255,0.1)', color: form.climb_partners === String(n) ? '#8b5cf6' : '#555' }}>{n}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                </Section>

                {/* Field Navigation */}
                <Section title="Field Navigation">
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <ToggleButton label="Trench" value={form.trench} onChange={v => set('trench', v)} />
                        <ToggleButton label="Bump" value={form.bump} onChange={v => set('bump', v)} />
                        <ToggleButton label="Bump Practiced" value={form.bump_practice} onChange={v => set('bump_practice', v)} />
                    </div>
                </Section>

                {/* Auto */}
                <Section title="Autonomous">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <Field label="Preferred Start">
                            <select style={selectStyle} value={form.auto_pref_start} onChange={e => set('auto_pref_start', e.target.value)}>
                                {AUTO_START.map(o => <option key={o} value={o} style={{ background: '#000' }}>{o}</option>)}
                            </select>
                        </Field>
                        <Field label="Preferred DS">
                            <select style={selectStyle} value={form.preferred_ds} onChange={e => set('preferred_ds', e.target.value)}>
                                {DS_OPTIONS.map(o => <option key={o} value={o} style={{ background: '#000' }}>{o}</option>)}
                            </select>
                        </Field>
                    </div>
                    <ToggleButton label="Auto Pickup" value={form.auto_pref_pickup} onChange={v => set('auto_pref_pickup', v)} />
                </Section>

                {/* Robot Photo */}
                <Section title="Robot Photo">
                    <RobotImageCapture value={form.robot_image_url} onChange={(v: string) => set('robot_image_url', v)} />
                    {!form.robot_image_url && (
                        <p style={{ fontSize: '10px', color: '#444', textAlign: 'center' }}>Photo helps alliance partners identify the robot quickly</p>
                    )}
                </Section>

                {/* Robot Assessment */}
                <Section title="Robot Assessment">
                    <Field label="Kitbot?">
                        <select style={selectStyle} value={form.kitbot} onChange={e => set('kitbot', e.target.value)}>
                            {['', 'Kitbot', 'Kitbot Modified', 'Custom'].map(o => <option key={o} value={o} style={{ background: '#000' }}>{o || '--'}</option>)}
                        </select>
                    </Field>
                    {(form.kitbot === 'Kitbot Modified' || form.kitbot === 'Custom') && (
                        <Field label="Modifications">
                            <input type="text" style={inputStyle} value={form.kitbot_modified} placeholder="Describe modifications..."
                                onChange={e => set('kitbot_modified', e.target.value)} />
                        </Field>
                    )}
                    <StarRating label="Robot Quality (1-5)" value={form.robot_quality} onChange={v => set('robot_quality', v)} />
                    <StarRating label="Pit Quality (1-5)" value={form.pit_quality} onChange={v => set('pit_quality', v)} />
                </Section>

                {/* Human Player */}
                <Section title="Human Player">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <Field label="Rating / Notes">
                            <input type="text" style={inputStyle} value={form.human_player} placeholder="e.g. 8 of 10"
                                onChange={e => set('human_player', e.target.value)} />
                        </Field>
                        <Field label="Height">
                            <input type="text" style={inputStyle} value={form.human_player_height} placeholder="e.g. 5'10&quot;"
                                onChange={e => set('human_player_height', e.target.value)} />
                        </Field>
                    </div>
                </Section>

                {/* Notes */}
                <Section title="Field Notes">
                    <textarea
                        value={form.other_notes}
                        onChange={e => set('other_notes', e.target.value)}
                        placeholder="Observations, concerns, conversation notes..."
                        style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
                    />
                </Section>

                {/* Submit */}
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!form.team || !form.scouter || form.scouter === '__new__'}
                    style={{ padding: '1.75rem', borderRadius: '24px', background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)', color: '#fff', border: 'none', fontWeight: 950, fontSize: '1.25rem', fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer', opacity: (!form.team || !form.scouter || form.scouter === '__new__') ? 0.4 : 1 }}
                >
                    {form.team ? `SAVE PIT — TEAM ${form.team.replace('frc', '')}` : 'SELECT A TEAM'}
                    {form.team && selectedTeamName ? ` · ${selectedTeamName.substring(0, 20)}` : ''}
                </button>
            </div>
        </main>
    );
}

function RobotImageCapture({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const handleSelectedFile = (file?: File) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => onChange(String(reader.result || ''));
        reader.readAsDataURL(file);
    };

    return (
        <div style={{ display: 'grid', gap: '0.6rem' }}>
            {value ? (
                <Image
                    src={value}
                    alt="Robot preview"
                    width={960}
                    height={640}
                    unoptimized
                    style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.12)' }}
                />
            ) : (
                <div style={{ padding: '0.9rem', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.2)', color: 'var(--muted)', textAlign: 'center', fontSize: '12px' }}>
                    No photo selected
                </div>
            )}
            <input type="file" accept="image/*" capture="environment" style={{ fontSize: '12px', color: 'var(--muted)' }} onChange={(e) => handleSelectedFile(e.target.files?.[0])} />
            {value && (
                <button type="button" onClick={() => onChange('')} style={{ width: 'fit-content', padding: '0.55rem 0.8rem', borderRadius: '10px', border: '1px solid rgba(205,93,116,0.35)', background: 'rgba(205,93,116,0.08)', color: 'var(--accent)', fontWeight: 650, cursor: 'pointer' }}>
                    Remove
                </button>
            )}
        </div>
    );
}
