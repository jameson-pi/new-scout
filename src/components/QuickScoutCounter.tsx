'use client';

import { memo } from 'react';

interface Props {
    value: number;
    onChange: (v: number) => void;
    label: string;
    max?: number;
}

function QuickScoutCounter({ value, onChange, label, max = 99 }: Props) {
    return (
        <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{label}</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'clamp(0.5rem, 2vw, 0.7rem)' }}>
                <button
                    onClick={() => onChange(Math.max(0, value - 1))}
                    style={{ width: 'clamp(40px, 10vw, 48px)', height: 'clamp(40px, 10vw, 48px)', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 'clamp(1rem, 4vw, 1.4rem)', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s ease' }}
                >
                    -
                </button>
                <span style={{ fontSize: 'clamp(1.75rem, 8vw, 2.1rem)', fontWeight: 760, color: 'var(--primary)', minWidth: '56px' }}>{value}</span>
                <button
                    onClick={() => onChange(Math.min(max, value + 1))}
                    style={{ width: 'clamp(40px, 10vw, 48px)', height: 'clamp(40px, 10vw, 48px)', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 'clamp(1rem, 4vw, 1.4rem)', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s ease' }}
                >
                    +
                </button>
            </div>
        </div>
    );
}

export default memo(QuickScoutCounter);

