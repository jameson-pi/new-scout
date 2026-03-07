'use client';

import { useMemo } from 'react';

interface MatchCountdownProps {
    schedule: { matchKey: string; red: string[]; blue: string[] }[];
    ourTeamKey: string;
    currentMatchLimit: number;
}

export default function MatchCountdown({ schedule, ourTeamKey, currentMatchLimit }: MatchCountdownProps) {
    const nextMatch = useMemo(() => {
        return schedule.find(m => {
            const matchNum = parseInt(m.matchKey.split('_qm').pop() || '0');
            return matchNum > currentMatchLimit && (m.red.includes(ourTeamKey) || m.blue.includes(ourTeamKey));
        });
    }, [schedule, ourTeamKey, currentMatchLimit]);

    if (!nextMatch) {
        return (
            <div className="glass" style={{ padding: '1rem', borderRadius: '15px', textAlign: 'center' }}>
                <p style={{ color: '#666', fontSize: '0.8rem' }}>No upcoming matches</p>
            </div>
        );
    }

    const matchNum = parseInt(nextMatch.matchKey.split('_qm').pop() || '0');
    const matchesUntil = matchNum - currentMatchLimit;
    const alliance = nextMatch.red.includes(ourTeamKey) ? 'red' : 'blue';

    return (
        <div
            className="glass"
            style={{
                padding: '1.5rem',
                borderRadius: '20px',
                borderLeft: `4px solid ${alliance === 'red' ? '#ef4444' : '#3b82f6'}`
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                    <p style={{ fontSize: '10px', fontWeight: 950, color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em' }}>NEXT MATCH</p>
                    <p style={{ fontSize: '2rem', fontWeight: 950, fontStyle: 'italic', color: 'var(--primary)' }}>QM{matchNum}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '10px', fontWeight: 950, color: '#888', textTransform: 'uppercase' }}>EST. TIME</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 950, color: '#fff' }}>~{matchesUntil * 7}min</p>
                </div>
            </div>

            <div style={{ display: 'grid', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '10px', fontWeight: 900, color: alliance === 'red' ? '#ef4444' : '#666' }}>RED</span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {nextMatch.red.map(t => (
                            <span
                                key={t}
                                style={{
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '5px',
                                    background: t === ourTeamKey ? '#ef4444' : 'rgba(239, 68, 68, 0.1)',
                                    color: t === ourTeamKey ? '#000' : '#ef4444',
                                    fontSize: '0.8rem',
                                    fontWeight: 900
                                }}
                            >
                                {t.replace('frc', '')}
                            </span>
                        ))}
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '10px', fontWeight: 900, color: alliance === 'blue' ? '#3b82f6' : '#666' }}>BLUE</span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {nextMatch.blue.map(t => (
                            <span
                                key={t}
                                style={{
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '5px',
                                    background: t === ourTeamKey ? '#3b82f6' : 'rgba(59, 130, 246, 0.1)',
                                    color: t === ourTeamKey ? '#000' : '#3b82f6',
                                    fontSize: '0.8rem',
                                    fontWeight: 900
                                }}
                            >
                                {t.replace('frc', '')}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px' }}>
                <p style={{ fontSize: '9px', fontWeight: 900, color: '#666', textTransform: 'uppercase' }}>PREP CHECKLIST</p>
                <ul style={{ fontSize: '0.8rem', color: '#888', margin: '0.5rem 0 0 1rem', paddingLeft: 0 }}>
                    <li>Battery charged</li>
                    <li>Auto routine selected</li>
                    <li>Driver practice complete</li>
                </ul>
            </div>
        </div>
    );
}
