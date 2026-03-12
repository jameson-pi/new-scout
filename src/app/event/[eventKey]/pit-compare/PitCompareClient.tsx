'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { PitReport } from '@/lib/data';

interface TeamEntry {
    teamKey: string;
    teamNum: number;
    name: string;
    pit: PitReport | null;
    ourEPA: number;
    sbEPA: number | null;
    avgFuel: number;
    avgTowerPts: number;
    towerRate: number;
    climbMax: number;
    avgDefense: number;
    failureRate: number;
    consistencyScore: number;
    matchCount: number;
}

interface PitCompareClientProps {
    eventKey: string;
    teams: TeamEntry[];
}

// ── helper ──────────────────────────────────────────────────────────────────
function yn(val: string | undefined | null): 'yes' | 'no' | 'unknown' {
    if (!val) return 'unknown';
    const v = val.trim().toLowerCase();
    if (v === 'yes') return 'yes';
    if (v === 'no') return 'no';
    return 'unknown';
}

function YNBadge({ val }: { val: string | undefined | null }) {
    const s = yn(val);
    const color = s === 'yes' ? '#22c55e' : s === 'no' ? '#ef4444' : '#555';
    const label = s === 'yes' ? '✓ YES' : s === 'no' ? '✗ NO' : '—';
    return (
        <span style={{
            fontSize: '10px', fontWeight: 950, letterSpacing: '0.05em',
            color, background: `${color}18`, padding: '0.2rem 0.5rem',
            borderRadius: '6px', border: `1px solid ${color}44`,
        }}>{label}</span>
    );
}

function Bar({ value, max, color = 'var(--primary)' }: { value: number; max: number; color?: string }) {
    const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
    return (
        <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', marginTop: '0.3rem' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '4px', transition: 'width 0.4s ease' }} />
        </div>
    );
}

// ── Attribute groups ─────────────────────────────────────────────────────────
type AttrGroup = {
    label: string;
    key: string;
    icon: string;
    type: 'yn' | 'number' | 'text' | 'stars' | 'perf';
    perfKey?: keyof TeamEntry;
    perfMax?: number;
    perfColor?: string;
    perfFormat?: (v: number) => string;
    pitKey?: keyof PitReport;
    description?: string;
};

const PIT_ATTRIBUTE_GROUPS: { section: string; color: string; attrs: AttrGroup[] }[] = [
    {
        section: 'Field Capabilities',
        color: '#3b82f6',
        attrs: [
            { key: 'trench',    label: 'Fits Under Trench',  icon: '🕳️',  type: 'yn', pitKey: 'trench',       description: '< 22" tall while traversing' },
            { key: 'bump',      label: 'Traverses Bump',     icon: '🏔️',  type: 'yn', pitKey: 'bump',         description: '6.5" bump clearance' },
            { key: 'bumpPrac',  label: 'Bump Practiced',     icon: '🧪',  type: 'yn', pitKey: 'bumpPractice', description: 'Has practiced bump crossing' },
            { key: 'turret',    label: 'Has Turret',         icon: '🎯',  type: 'yn', pitKey: 'turret' },
            { key: 'canLob',    label: 'Can Lob',            icon: '🪃',  type: 'yn', pitKey: 'canLob' },
            { key: 'canDoze',   label: 'Can Doze (Push)',    icon: '🦾',  type: 'yn', pitKey: 'canDoze' },
        ],
    },
    {
        section: 'Fuel & Intake',
        color: '#a855f7',
        attrs: [
            { key: 'hopperCap',  label: 'Hopper Capacity',  icon: '⛽', type: 'number', pitKey: 'hopperCapacity' },
            { key: 'floorPick',  label: 'Floor Pickup',     icon: '⬇️', type: 'yn',     pitKey: 'pickupFloor' },
            { key: 'outpPost',   label: 'Outpost Pickup',   icon: '🏗️', type: 'yn',     pitKey: 'pickupOutpost' },
            { key: 'shiftTrack', label: 'Shift Tracking',   icon: '🔄', type: 'yn',     pitKey: 'shiftTracking',  description: 'Detects hub active/inactive' },
        ],
    },
    {
        section: 'Climbing',
        color: '#22c55e',
        attrs: [
            { key: 'climbLvl',   label: 'Max Climb Level',  icon: '🧗', type: 'text',  pitKey: 'climb' },
            { key: 'autoClimb',  label: 'Auto Climb',       icon: '⚡', type: 'yn',    pitKey: 'autoClimb' },
            { key: 'climbPart',  label: 'Climb Partners',   icon: '🤝', type: 'number', pitKey: 'climbPartners' },
        ],
    },
    {
        section: 'Autonomous',
        color: '#eab308',
        attrs: [
            { key: 'autoStart',  label: 'Auto Start Pos',   icon: '📍', type: 'text',  pitKey: 'autoPrefStart' },
            { key: 'autoPickup', label: 'Auto Pickup',      icon: '🔃', type: 'yn',    pitKey: 'autoPrefPickup' },
        ],
    },
    {
        section: 'Robot Specs',
        color: '#f97316',
        attrs: [
            { key: 'weight',     label: 'Weight (lbs)',     icon: '⚖️',  type: 'number', pitKey: 'weightLbs' },
            { key: 'height',     label: 'Height (in)',      icon: '📏',  type: 'number', pitKey: 'heightIn' },
            { key: 'drive',      label: 'Drivetrain',       icon: '⚙️',  type: 'text',   pitKey: 'drivebase' },
            { key: 'code',       label: 'Code Language',    icon: '💻',  type: 'text',   pitKey: 'codeLanguage' },
            { key: 'rqual',      label: 'Robot Quality',    icon: '⭐',  type: 'stars',  pitKey: 'robotQuality' },
            { key: 'pqual',      label: 'Pit Quality',      icon: '🔧',  type: 'stars',  pitKey: 'pitQuality' },
        ],
    },
    {
        section: 'Match Performance',
        color: '#ef4444',
        attrs: [
            { key: 'epa',     label: 'Our EPA',        icon: '📊', type: 'perf', perfKey: 'ourEPA',          perfMax: 0, perfColor: 'var(--primary)',  perfFormat: (v) => v.toFixed(1) },
            { key: 'fuel',    label: 'Avg Fuel/Match', icon: '⛽', type: 'perf', perfKey: 'avgFuel',         perfMax: 0, perfColor: '#a855f7',         perfFormat: (v) => v.toFixed(1) },
            { key: 'tower',   label: 'Avg Tower Pts',  icon: '🗼', type: 'perf', perfKey: 'avgTowerPts',     perfMax: 30,perfColor: '#3b82f6',         perfFormat: (v) => v.toFixed(1) },
            { key: 'trate',   label: 'Tower Rate %',   icon: '📈', type: 'perf', perfKey: 'towerRate',       perfMax: 100,perfColor: '#22c55e',        perfFormat: (v) => v.toFixed(0) + '%' },
            { key: 'clmax',   label: 'Best Climb',     icon: '🏆', type: 'perf', perfKey: 'climbMax',        perfMax: 30, perfColor: '#22c55e',        perfFormat: (v) => v === 0 ? '—' : `L${v/10}` },
            { key: 'def',     label: 'Avg Defense',    icon: '🛡️', type: 'perf', perfKey: 'avgDefense',      perfMax: 5,  perfColor: '#ef4444',        perfFormat: (v) => v.toFixed(1) },
            { key: 'fail',    label: 'Failure Rate',   icon: '💥', type: 'perf', perfKey: 'failureRate',     perfMax: 100,perfColor: '#ef4444',        perfFormat: (v) => v.toFixed(0) + '%' },
            { key: 'consist', label: 'Consistency',    icon: '🎯', type: 'perf', perfKey: 'consistencyScore',perfMax: 100,perfColor: '#eab308',        perfFormat: (v) => v.toFixed(0) },
        ],
    },
];

const TEAM_COLORS = ['var(--primary)', '#3b82f6', '#22c55e', '#eab308', '#f97316', '#ec4899'];

// ── Population split definition ───────────────────────────────────────────────
type PopSplit = {
    label: string;
    icon: string;
    color: string;
    yesLabel: string;
    noLabel: string;
    check: (p: PitReport) => boolean | null; // null = unknown
};

const POP_SPLITS: PopSplit[] = [
    { label: 'Trench Fit',     icon: '🕳️', color: '#3b82f6', yesLabel: 'Fits Under Trench', noLabel: 'Cannot Fit',      check: p => p.trench ? yn(p.trench) === 'yes' : null },
    { label: 'Bump Traverse',  icon: '🏔️', color: '#f97316', yesLabel: 'Traverses Bump',    noLabel: 'Avoids Bump',     check: p => p.bump ? yn(p.bump) === 'yes' : null },
    { label: 'Floor Pickup',   icon: '⬇️', color: '#a855f7', yesLabel: 'Floor Pickup',       noLabel: 'No Floor Pickup', check: p => p.pickupFloor ? yn(p.pickupFloor) === 'yes' : null },
    { label: 'Outpost Pickup', icon: '🏗️', color: '#6366f1', yesLabel: 'Outpost Pickup',     noLabel: 'No Outpost',      check: p => p.pickupOutpost ? yn(p.pickupOutpost) === 'yes' : null },
    { label: 'Has Turret',     icon: '🎯', color: '#ec4899', yesLabel: 'Has Turret',          noLabel: 'Fixed Shooter',   check: p => p.turret ? yn(p.turret) === 'yes' : null },
    { label: 'Can Lob',        icon: '🪃', color: '#eab308', yesLabel: 'Can Lob',             noLabel: 'Cannot Lob',      check: p => p.canLob ? yn(p.canLob) === 'yes' : null },
    { label: 'Shift Tracking', icon: '🔄', color: '#22c55e', yesLabel: 'Shift-Aware',         noLabel: 'Not Shift-Aware', check: p => p.shiftTracking ? yn(p.shiftTracking) === 'yes' : null },
    { label: 'L2+ Climber',    icon: '🧗', color: '#22c55e', yesLabel: 'L2 or L3 Climb',     noLabel: 'L1 or No Climb',  check: p => p.climb ? (p.climb === 'L2' || p.climb === 'L3' || p.climb === 'Level2' || p.climb === 'Level3') : null },
    { label: 'L3 Climber',     icon: '🏆', color: '#f97316', yesLabel: 'L3 Climb',           noLabel: 'Below L3',        check: p => p.climb ? (p.climb === 'L3' || p.climb === 'Level3') : null },
    { label: 'Swerve Drive',   icon: '⚙️', color: '#6366f1', yesLabel: 'Swerve',             noLabel: 'Non-Swerve',      check: p => p.drivebase ? (p.drivebase.toLowerCase().includes('swerve')) : null },
];

function avg(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/** Remove outliers using IQR fences (1.5× rule) on a numeric field */
function filterIQR(teams: TeamEntry[], key: keyof TeamEntry): TeamEntry[] {
    if (teams.length < 4) return teams;
    const vals = [...teams.map(t => (t[key] as unknown) as number)].sort((a, b) => a - b);
    const q1 = vals[Math.floor(vals.length * 0.25)];
    const q3 = vals[Math.floor(vals.length * 0.75)];
    const iqr = q3 - q1;
    const lo = q1 - 1.5 * iqr;
    const hi = q3 + 1.5 * iqr;
    return teams.filter(t => {
        const v = (t[key] as unknown) as number;
        return v >= lo && v <= hi;
    });
}

function PopulationAnalysis({ teams }: { teams: TeamEntry[] }) {
    const [expanded, setExpanded] = useState<string | null>(null);
    const [useIQR, setUseIQR] = useState(false);
    const [excludeNonScoring, setExcludeNonScoring] = useState(false);

    const teamsWithPit = teams.filter(t => t.pit !== null);

    if (teamsWithPit.length < 3) return null;

    // Build the base pool used for stats (applies global filters)
    function applyGlobalFilters(pool: TeamEntry[]): TeamEntry[] {
        let result = pool;
        if (excludeNonScoring) result = result.filter(t => t.avgFuel > 0 || t.avgTowerPts > 0);
        if (useIQR) result = filterIQR(result, 'ourEPA');
        return result;
    }

    // Count how many teams are removed by current filters (for UI feedback)
    const basePool = teamsWithPit.filter(t => t.matchCount > 0);
    const filteredPool = applyGlobalFilters(basePool);
    const removedCount = basePool.length - filteredPool.length;

    return (
        <div style={{ marginTop: '3rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 950, fontStyle: 'italic', color: '#fff', marginBottom: '0.25rem' }}>
                            FIELD POPULATION ANALYSIS
                        </h2>
                        <p style={{ color: '#555', fontSize: '0.85rem' }}>
                            Across all {teamsWithPit.length} pit-scouted teams at this event — do robots with a feature actually perform better?
                        </p>
                    </div>

                    {/* Filter toggles */}
                    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '9px', fontWeight: 950, color: '#444', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Stats filter:</span>

                        {/* IQR toggle */}
                        <button
                            onClick={() => setUseIQR(v => !v)}
                            title="Remove statistical outliers using Interquartile Range (1.5× IQR rule) — keeps comparisons fair by excluding anomalously high or low scorers"
                            style={{
                                padding: '0.4rem 0.9rem', borderRadius: '20px', cursor: 'pointer',
                                fontSize: '10px', fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.05em',
                                border: '1px solid',
                                borderColor: useIQR ? '#6366f1' : 'rgba(255,255,255,0.1)',
                                background: useIQR ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                                color: useIQR ? '#818cf8' : '#666',
                                transition: 'all 0.2s',
                            }}
                        >
                            {useIQR ? '◉' : '○'} IQR Outlier Removal
                        </button>

                        {/* Exclude non-scorers toggle */}
                        <button
                            onClick={() => setExcludeNonScoring(v => !v)}
                            title="Exclude robots that scored 0 fuel and 0 tower points — removes broken/defensive-only robots from the averages"
                            style={{
                                padding: '0.4rem 0.9rem', borderRadius: '20px', cursor: 'pointer',
                                fontSize: '10px', fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.05em',
                                border: '1px solid',
                                borderColor: excludeNonScoring ? '#f97316' : 'rgba(255,255,255,0.1)',
                                background: excludeNonScoring ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.03)',
                                color: excludeNonScoring ? '#fb923c' : '#666',
                                transition: 'all 0.2s',
                            }}
                        >
                            {excludeNonScoring ? '◉' : '○'} Exclude Non-Scorers
                        </button>

                        {/* Removed-count badge */}
                        {(useIQR || excludeNonScoring) && removedCount > 0 && (
                            <span style={{ fontSize: '9px', fontWeight: 950, color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '0.2rem 0.5rem', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.25)' }}>
                                −{removedCount} robot{removedCount !== 1 ? 's' : ''} removed from stats
                            </span>
                        )}
                        {(useIQR || excludeNonScoring) && removedCount === 0 && (
                            <span style={{ fontSize: '9px', fontWeight: 950, color: '#22c55e', background: 'rgba(34,197,94,0.08)', padding: '0.2rem 0.5rem', borderRadius: '10px', border: '1px solid rgba(34,197,94,0.2)' }}>
                                No outliers found
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gap: '1rem' }}>
                {POP_SPLITS.map(split => {
                    const withFeature  = teamsWithPit.filter(t => split.check(t.pit!) === true);
                    const withoutFeature = teamsWithPit.filter(t => split.check(t.pit!) === false);
                    if (withFeature.length === 0 && withoutFeature.length === 0) return null;

                    // Apply global filters before computing averages
                    const withPerf    = applyGlobalFilters(withFeature.filter(t  => t.matchCount > 0));
                    const withoutPerf = applyGlobalFilters(withoutFeature.filter(t => t.matchCount > 0));

                    const withEPA    = avg(withPerf.map(t => t.ourEPA));
                    const withoutEPA = avg(withoutPerf.map(t => t.ourEPA));
                    const withFuel   = avg(withPerf.map(t => t.avgFuel));
                    const withoutFuel = avg(withoutPerf.map(t => t.avgFuel));
                    const withTower  = avg(withPerf.map(t => t.avgTowerPts));
                    const withoutTower = avg(withoutPerf.map(t => t.avgTowerPts));

                    const epaDiff  = withEPA - withoutEPA;
                    const fuelDiff = withFuel - withoutFuel;
                    const isOpen   = expanded === split.label;
                    const maxEPA   = Math.max(...filteredPool.map(t => t.ourEPA), 1);
                    const maxFuel  = Math.max(...filteredPool.map(t => t.avgFuel), 1);
                    const maxTower = 30;

                    return (
                        <div key={split.label} className="glass" style={{ borderRadius: '20px', overflow: 'hidden', border: `1px solid ${split.color}22` }}>
                            {/* Header row — always visible */}
                            <button
                                onClick={() => setExpanded(isOpen ? null : split.label)}
                                style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: '1.25rem 1.5rem', textAlign: 'left' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '1.2rem' }}>{split.icon}</span>
                                    <span style={{ fontSize: '0.9rem', fontWeight: 950, color: split.color, minWidth: '130px' }}>{split.label}</span>

                                    {/* Pill counts */}
                                    <span style={{ fontSize: '10px', fontWeight: 950, background: `${split.color}18`, color: split.color, padding: '0.2rem 0.6rem', borderRadius: '20px', border: `1px solid ${split.color}44` }}>
                                        {withFeature.length} {split.yesLabel}
                                    </span>
                                    <span style={{ fontSize: '10px', fontWeight: 950, background: 'rgba(255,255,255,0.04)', color: '#666', padding: '0.2rem 0.6rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                        {withoutFeature.length} {split.noLabel}
                                    </span>

                                    {/* EPA delta badge */}
                                    {withPerf.length > 0 && withoutPerf.length > 0 && (
                                        <span style={{
                                            fontSize: '11px', fontWeight: 950, marginLeft: 'auto',
                                            color: epaDiff > 1 ? '#22c55e' : epaDiff < -1 ? '#ef4444' : '#888',
                                            background: epaDiff > 1 ? 'rgba(34,197,94,0.1)' : epaDiff < -1 ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.04)',
                                            padding: '0.2rem 0.6rem', borderRadius: '20px',
                                            border: `1px solid ${epaDiff > 1 ? 'rgba(34,197,94,0.3)' : epaDiff < -1 ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.08)'}`,
                                        }}>
                                            EPA {epaDiff > 0 ? '+' : ''}{epaDiff.toFixed(1)} pts
                                        </span>
                                    )}
                                    <span style={{ color: '#555', fontSize: '12px', marginLeft: withPerf.length === 0 || withoutPerf.length === 0 ? 'auto' : '0' }}>
                                        {isOpen ? '▲' : '▼'}
                                    </span>
                                </div>
                            </button>

                            {/* Expanded detail */}
                            {isOpen && (
                                <div style={{ padding: '0 1.5rem 1.5rem', borderTop: `1px solid ${split.color}22` }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.25rem' }}>

                                        {/* WITH feature */}
                                        <div>
                                            <p style={{ fontSize: '10px', fontWeight: 950, color: split.color, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.75rem' }}>
                                                ✓ {split.yesLabel} ({withPerf.length}{withFeature.length - withPerf.length > 0 ? `/${withFeature.length}` : ''} in stats)
                                            </p>
                                            {withPerf.length > 0 ? (
                                                <div style={{ display: 'grid', gap: '0.6rem', marginBottom: '1rem' }}>
                                                    {[
                                                        { label: 'Avg EPA',       val: withEPA,   max: maxEPA,   fmt: (v: number) => v.toFixed(1), color: split.color },
                                                        { label: 'Avg Fuel',      val: withFuel,  max: maxFuel,  fmt: (v: number) => v.toFixed(1), color: '#a855f7' },
                                                        { label: 'Avg Tower Pts', val: withTower, max: maxTower, fmt: (v: number) => v.toFixed(1), color: '#22c55e' },
                                                    ].map(m => (
                                                        <div key={m.label}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                                                                <span style={{ fontSize: '10px', color: '#666' }}>{m.label}</span>
                                                                <span style={{ fontSize: '11px', fontWeight: 950, color: m.color }}>{m.fmt(m.val)}</span>
                                                            </div>
                                                            <Bar value={m.val} max={m.max} color={m.color} />
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p style={{ fontSize: '11px', color: '#444', fontStyle: 'italic', marginBottom: '0.75rem' }}>No match data yet</p>
                                            )}
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                                                {withFeature.map(t => {
                                                    const inStats = withPerf.includes(t);
                                                    return (
                                                        <span key={t.teamKey} title={!inStats ? (t.matchCount === 0 ? 'No match data' : 'Excluded by filter') : ''} style={{ fontSize: '10px', fontWeight: 900, background: inStats ? `${split.color}15` : 'rgba(255,255,255,0.02)', color: inStats ? split.color : '#333', padding: '0.15rem 0.5rem', borderRadius: '8px', border: `1px solid ${inStats ? split.color + '33' : 'rgba(255,255,255,0.04)'}`, textDecoration: inStats ? 'none' : 'line-through' }}>
                                                            {t.teamNum}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* WITHOUT feature */}
                                        <div>
                                            <p style={{ fontSize: '10px', fontWeight: 950, color: '#666', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.75rem' }}>
                                                ✗ {split.noLabel} ({withoutFeature.length} teams)
                                            </p>
                                            {withoutPerf.length > 0 ? (
                                                <div style={{ display: 'grid', gap: '0.6rem', marginBottom: '1rem' }}>
                                                    {[
                                                        { label: 'Avg EPA',       val: withoutEPA,   max: maxEPA,   fmt: (v: number) => v.toFixed(1), color: '#555' },
                                                        { label: 'Avg Fuel',      val: withoutFuel,  max: maxFuel,  fmt: (v: number) => v.toFixed(1), color: '#555' },
                                                        { label: 'Avg Tower Pts', val: withoutTower, max: maxTower, fmt: (v: number) => v.toFixed(1), color: '#555' },
                                                    ].map(m => (
                                                        <div key={m.label}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                                                                <span style={{ fontSize: '10px', color: '#555' }}>{m.label}</span>
                                                                <span style={{ fontSize: '11px', fontWeight: 950, color: m.color }}>{m.fmt(m.val)}</span>
                                                            </div>
                                                            <Bar value={m.val} max={m.max} color={m.color} />
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p style={{ fontSize: '11px', color: '#444', fontStyle: 'italic', marginBottom: '0.75rem' }}>No match data yet</p>
                                            )}
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                                                {withoutFeature.map(t => {
                                                    const inStats = withoutPerf.includes(t);
                                                    return (
                                                        <span key={t.teamKey} title={!inStats ? (t.matchCount === 0 ? 'No match data' : 'Excluded by filter') : ''} style={{ fontSize: '10px', fontWeight: 900, background: inStats ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.01)', color: inStats ? '#555' : '#2a2a2a', padding: '0.15rem 0.5rem', borderRadius: '8px', border: `1px solid ${inStats ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)'}`, textDecoration: inStats ? 'none' : 'line-through' }}>
                                                            {t.teamNum}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Insight callout */}
                                    {withPerf.length > 0 && withoutPerf.length > 0 && (
                                        <div style={{ marginTop: '1.25rem', padding: '0.75rem 1rem', borderRadius: '12px', background: epaDiff > 1 ? 'rgba(34,197,94,0.06)' : epaDiff < -1 ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.03)', border: `1px solid ${epaDiff > 1 ? 'rgba(34,197,94,0.2)' : epaDiff < -1 ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)'}` }}>
                                            <p style={{ fontSize: '0.8rem', color: '#ccc', lineHeight: 1.6 }}>
                                                {epaDiff > 2
                                                    ? `💡 ${split.yesLabel} robots score ${epaDiff.toFixed(1)} more EPA pts/match on average — a meaningful advantage.`
                                                    : epaDiff < -2
                                                    ? `💡 Surprisingly, ${split.noLabel} robots score ${Math.abs(epaDiff).toFixed(1)} more EPA pts/match — ${split.yesLabel} may not be a differentiator here.`
                                                    : `💡 EPA difference is small (${Math.abs(epaDiff).toFixed(1)} pts) — ${split.label} alone doesn't strongly predict performance at this event.`
                                                }
                                                {fuelDiff > 5 && ` ${split.yesLabel} also scores ${fuelDiff.toFixed(0)} more fuel/match.`}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── Filter presets ────────────────────────────────────────────────────────────
const FILTER_PRESETS = [
    { label: 'Trench Fit', key: 'trench', description: 'Can fit under the 22" Trench' },
    { label: 'High Climbers', key: 'climb_l3', description: 'L3 tower climbers' },
    { label: 'Floor Pickup', key: 'pickup_floor', description: 'Can pick up fuel from floor' },
    { label: 'Shift-Aware', key: 'shift_tracking', description: 'Tracks hub active/inactive shifts' },
    { label: 'Has Turret', key: 'turret', description: 'Robot has a turret for shooting' },
    { label: 'Bump Ready', key: 'bump', description: 'Can traverse the 6.5" bump' },
];

export default function PitCompareClient({ eventKey, teams }: PitCompareClientProps) {
    const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState<string | null>(null);
    const [activeSection, setActiveSection] = useState<string | null>(null);

    // Compute dynamic maxes for perf attrs
    const perfMaxes = useMemo(() => {
        return {
            ourEPA: Math.max(...teams.map(t => t.ourEPA), 1),
            avgFuel: Math.max(...teams.map(t => t.avgFuel), 1),
        };
    }, [teams]);

    // Filter teams by active preset
    const filteredByPreset = useMemo(() => {
        if (!activeFilter) return teams;
        return teams.filter(t => {
            const p = t.pit;
            if (!p) return false;
            switch (activeFilter) {
                case 'trench': return yn(p.trench) === 'yes';
                case 'climb_l3': return p.climb === 'L3' || p.climb === 'Level3';
                case 'pickup_floor': return yn(p.pickupFloor) === 'yes';
                case 'shift_tracking': return yn(p.shiftTracking) === 'yes';
                case 'turret': return yn(p.turret) === 'yes';
                case 'bump': return yn(p.bump) === 'yes';
                default: return true;
            }
        });
    }, [teams, activeFilter]);

    const searchFiltered = useMemo(() => {
        return filteredByPreset.filter(t =>
            !selectedTeams.includes(t.teamKey) &&
            (t.teamKey.includes(searchTerm) ||
             t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
             t.teamNum.toString().includes(searchTerm))
        );
    }, [filteredByPreset, selectedTeams, searchTerm]);

    const comparedTeams = useMemo(() =>
        selectedTeams.map(tk => teams.find(t => t.teamKey === tk)).filter(Boolean) as TeamEntry[],
        [selectedTeams, teams]
    );

    function getAttrValue(team: TeamEntry, attr: AttrGroup): React.ReactNode {
    if (attr.type === 'perf') {
        const getNum = (t: TeamEntry) => (t[attr.perfKey!] as unknown) as number;
        const val = getNum(team);
        const maxDynamic = (perfMaxes as Record<string, number>)[attr.perfKey! as string] ?? 1;
        const max = attr.perfMax! > 0 ? attr.perfMax! : maxDynamic;
        const formatted = attr.perfFormat!(val);
        const isWinner = Math.max(...comparedTeams.map(getNum)) === val;
        // Failure rate: lower is better
        const isBest = attr.key === 'fail'
            ? Math.min(...comparedTeams.map(getNum)) === val
            : isWinner;
            return (
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontSize: '1.4rem', fontWeight: 950, color: isBest ? attr.perfColor : '#fff' }}>{formatted}</span>
                        {isBest && team.matchCount > 0 && (
                            <span style={{ fontSize: '8px', background: attr.perfColor, color: '#000', padding: '0.15rem 0.3rem', borderRadius: '4px', fontWeight: 950 }}>BEST</span>
                        )}
                    </div>
                    {team.matchCount > 0
                        ? <Bar value={val} max={max} color={attr.perfColor} />
                        : <span style={{ fontSize: '10px', color: '#444' }}>No match data</span>
                    }
                </div>
            );
        }

        if (!team.pit) {
            return <span style={{ color: '#333', fontSize: '12px' }}>No pit data</span>;
        }

        const pitVal = team.pit[attr.pitKey!] as string | number | null | undefined;

        if (attr.type === 'yn') return <YNBadge val={pitVal != null ? String(pitVal) : null} />;

        if (attr.type === 'stars') {
            const n = Number(pitVal) || 0;
            return (
                <div style={{ display: 'flex', gap: '2px' }}>
                    {Array.from({ length: 5 }, (_, i) => (
                        <span key={i} style={{ fontSize: '14px', color: i < n ? '#eab308' : '#333' }}>★</span>
                    ))}
                </div>
            );
        }

        if (attr.type === 'number') {
            const n = Number(pitVal);
            if (isNaN(n) || pitVal == null || pitVal === '') return <span style={{ color: '#444', fontSize: '12px' }}>—</span>;
            const isWinner = Math.max(...comparedTeams.map(t => Number(t.pit?.[attr.pitKey!]) || 0)) === n;
            return (
                <div>
                    <span style={{ fontSize: '1.4rem', fontWeight: 950, color: isWinner ? '#fff' : '#aaa' }}>{n}</span>
                </div>
            );
        }

        if (attr.type === 'text') {
            const s = String(pitVal || '').trim();
            if (!s) return <span style={{ color: '#444', fontSize: '12px' }}>—</span>;
            return <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e2e8f0' }}>{s}</span>;
        }

        return null;
    }

    const visibleGroups = activeSection
        ? PIT_ATTRIBUTE_GROUPS.filter(g => g.section === activeSection)
        : PIT_ATTRIBUTE_GROUPS;

    return (
        <main style={{ minHeight: '100vh', background: '#000', color: '#fff', padding: '4rem 2rem 6rem' }}>
            <div className="mx-auto" style={{ maxWidth: '1400px' }}>

                {/* Header */}
                <header style={{ marginBottom: '2.5rem' }}>
                    <Link href={`/event/${eventKey}`} style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '0.75rem', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', display: 'block', marginBottom: '1rem' }}>
                        ← BACK TO DASHBOARD
                    </Link>
                    <h1 className="text-gradient" style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 950, fontStyle: 'italic', lineHeight: 1 }}>
                        PIT × PERFORMANCE
                    </h1>
                    <p style={{ color: '#888', fontSize: '1rem', marginTop: '0.4rem' }}>
                        Compare pit attributes vs. match performance — up to 6 teams side-by-side
                    </p>
                </header>

                {/* Filter Presets */}
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                    <span style={{ fontSize: '10px', fontWeight: 950, color: '#555', textTransform: 'uppercase', alignSelf: 'center', letterSpacing: '0.15em' }}>FILTER BY:</span>
                    {FILTER_PRESETS.map(f => (
                        <button
                            key={f.key}
                            onClick={() => setActiveFilter(activeFilter === f.key ? null : f.key)}
                            title={f.description}
                            style={{
                                padding: '0.4rem 1rem', borderRadius: '20px', cursor: 'pointer',
                                fontSize: '11px', fontWeight: 950, textTransform: 'uppercase',
                                border: '1px solid',
                                borderColor: activeFilter === f.key ? '#22c55e' : 'rgba(255,255,255,0.12)',
                                background: activeFilter === f.key ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.03)',
                                color: activeFilter === f.key ? '#22c55e' : '#888',
                                transition: 'all 0.2s',
                            }}
                        >
                            {f.label} ({filteredByPreset.filter(t => {
                                const p = t.pit;
                                if (!p) return false;
                                switch (f.key) {
                                    case 'trench': return yn(p.trench) === 'yes';
                                    case 'climb_l3': return p.climb === 'L3' || p.climb === 'Level3';
                                    case 'pickup_floor': return yn(p.pickupFloor) === 'yes';
                                    case 'shift_tracking': return yn(p.shiftTracking) === 'yes';
                                    case 'turret': return yn(p.turret) === 'yes';
                                    case 'bump': return yn(p.bump) === 'yes';
                                    default: return false;
                                }
                            }).length})
                        </button>
                    ))}
                    {activeFilter && (
                        <button onClick={() => setActiveFilter(null)} style={{ padding: '0.4rem 0.75rem', borderRadius: '20px', cursor: 'pointer', fontSize: '11px', fontWeight: 950, background: 'transparent', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444' }}>
                            ✕ Clear
                        </button>
                    )}
                </div>

                {/* Section Filter */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
                    <span style={{ fontSize: '10px', fontWeight: 950, color: '#555', textTransform: 'uppercase', alignSelf: 'center', letterSpacing: '0.15em' }}>SHOW:</span>
                    <button
                        onClick={() => setActiveSection(null)}
                        style={{ padding: '0.35rem 0.85rem', borderRadius: '16px', cursor: 'pointer', fontSize: '10px', fontWeight: 950, textTransform: 'uppercase', border: '1px solid', borderColor: !activeSection ? 'var(--primary)' : 'rgba(255,255,255,0.1)', background: !activeSection ? 'rgba(168,85,247,0.1)' : 'transparent', color: !activeSection ? 'var(--primary)' : '#666' }}
                    >ALL</button>
                    {PIT_ATTRIBUTE_GROUPS.map(g => (
                        <button
                            key={g.section}
                            onClick={() => setActiveSection(activeSection === g.section ? null : g.section)}
                            style={{ padding: '0.35rem 0.85rem', borderRadius: '16px', cursor: 'pointer', fontSize: '10px', fontWeight: 950, textTransform: 'uppercase', border: '1px solid', borderColor: activeSection === g.section ? g.color : 'rgba(255,255,255,0.1)', background: activeSection === g.section ? `${g.color}18` : 'transparent', color: activeSection === g.section ? g.color : '#666' }}
                        >
                            {g.section}
                        </button>
                    ))}
                </div>

                {/* Team Search & Selection */}
                <div className="glass" style={{ padding: '1.5rem', borderRadius: '25px', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <input
                            type="text"
                            placeholder="Search teams to compare..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px', padding: '0.75rem 1rem', color: '#fff', fontSize: '1rem', minWidth: '220px',
                            }}
                        />
                        {selectedTeams.map((tk, i) => {
                            const t = teams.find(t => t.teamKey === tk);
                            return (
                                <div key={tk} style={{ background: TEAM_COLORS[i], color: '#000', padding: '0.5rem 1rem', borderRadius: '20px', fontWeight: 950, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {t?.teamNum} — {t?.name}
                                    <button onClick={() => setSelectedTeams(selectedTeams.filter(s => s !== tk))} style={{ background: 'none', border: 'none', color: '#000', cursor: 'pointer', fontWeight: 900, fontSize: '1rem' }}>×</button>
                                </div>
                            );
                        })}
                        {selectedTeams.length < 6 && (
                            <span style={{ fontSize: '11px', color: '#444', fontStyle: 'italic' }}>
                                {6 - selectedTeams.length} slot{6 - selectedTeams.length !== 1 ? 's' : ''} remaining
                            </span>
                        )}
                    </div>

                    {/* Search dropdown */}
                    {(searchTerm || activeFilter) && searchFiltered.length > 0 && selectedTeams.length < 6 && (
                        <div style={{ marginTop: '1rem', display: 'grid', gap: '0.5rem', maxHeight: '260px', overflowY: 'auto' }}>
                            {searchFiltered.slice(0, 12).map(t => (
                                <button
                                    key={t.teamKey}
                                    onClick={() => { setSelectedTeams([...selectedTeams, t.teamKey]); setSearchTerm(''); }}
                                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', color: '#fff', cursor: 'pointer', textAlign: 'left' }}
                                >
                                    <span><b style={{ color: 'var(--primary)' }}>{t.teamNum}</b> {t.name}</span>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        {t.pit && <span style={{ fontSize: '9px', background: 'rgba(168,85,247,0.15)', color: '#a855f7', padding: '0.15rem 0.4rem', borderRadius: '5px', fontWeight: 900 }}>PIT ✓</span>}
                                        {t.pit && <YNBadge val={t.pit.trench} />}
                                        <span style={{ color: 'var(--secondary)', fontSize: '0.8rem', fontWeight: 900 }}>EPA {t.ourEPA.toFixed(1)}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Quick-add all filtered (if few enough) */}
                    {activeFilter && filteredByPreset.length <= 8 && filteredByPreset.length > 0 && (
                        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                            <p style={{ fontSize: '10px', color: '#555', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                                QUICK ADD — {filteredByPreset.length} teams match filter
                            </p>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {filteredByPreset
                                    .filter(t => !selectedTeams.includes(t.teamKey))
                                    .slice(0, 6 - selectedTeams.length)
                                    .map(t => (
                                        <button key={t.teamKey} onClick={() => setSelectedTeams(prev => [...prev, t.teamKey].slice(0, 6))}
                                            style={{ padding: '0.35rem 0.75rem', borderRadius: '14px', cursor: 'pointer', fontSize: '11px', fontWeight: 950, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e' }}>
                                            + {t.teamNum}
                                        </button>
                                    ))}
                                {filteredByPreset.filter(t => !selectedTeams.includes(t.teamKey)).length > 0 && (
                                    <button
                                        onClick={() => setSelectedTeams(filteredByPreset.filter(t => !selectedTeams.includes(t.teamKey)).slice(0, 6 - selectedTeams.length).map(t => t.teamKey).concat(selectedTeams).slice(0, 6))}
                                        style={{ padding: '0.35rem 0.75rem', borderRadius: '14px', cursor: 'pointer', fontSize: '11px', fontWeight: 950, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)', color: '#22c55e' }}>
                                        + Add All
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Empty state */}
                {comparedTeams.length === 0 && (
                    <div className="glass" style={{ padding: '4rem', borderRadius: '30px', textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
                        <p style={{ color: '#666', fontSize: '1.25rem', fontWeight: 700 }}>
                            Select teams above to compare pit attributes vs. performance
                        </p>
                        <p style={{ color: '#444', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                            Use the filter presets to quickly find teams with specific capabilities
                        </p>
                    </div>
                )}

                {/* Comparison table */}
                {comparedTeams.length >= 1 && (
                    <div className="glass" style={{ padding: '2rem', borderRadius: '30px', overflowX: 'auto' }}>
                        {/* Team headers */}
                        <div style={{ display: 'grid', gridTemplateColumns: `220px repeat(${comparedTeams.length}, minmax(160px, 1fr))`, gap: '1rem', marginBottom: '2rem', minWidth: `${220 + comparedTeams.length * 160}px` }}>
                            <div />
                            {comparedTeams.map((t, i) => (
                                <div key={t.teamKey} style={{ textAlign: 'center' }}>
                                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: TEAM_COLORS[i], margin: '0 auto 0.5rem' }} />
                                    <Link href={`/event/${eventKey}/team/${t.teamKey}`} style={{ textDecoration: 'none' }}>
                                        <p style={{ fontSize: '2.5rem', fontWeight: 950, color: TEAM_COLORS[i], lineHeight: 1 }}>{t.teamNum}</p>
                                        <p style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.3rem' }}>{t.name}</p>
                                    </Link>
                                    <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                                        {t.pit && <span style={{ fontSize: '8px', background: 'rgba(168,85,247,0.15)', color: '#a855f7', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 900 }}>PIT ✓</span>}
                                        {t.matchCount > 0 && <span style={{ fontSize: '8px', background: 'rgba(34,197,94,0.1)', color: '#22c55e', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 900 }}>{t.matchCount} MATCHES</span>}
                                        {!t.pit && <span style={{ fontSize: '8px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 900 }}>NO PIT</span>}
                                    </div>
                                    {t.pit?.robotImageUrl && (
                                        <Image
                                            src={t.pit.robotImageUrl}
                                            alt={`Team ${t.teamNum} robot`}
                                            width={80}
                                            height={60}
                                            style={{ objectFit: 'cover', borderRadius: '10px', marginTop: '0.5rem', border: `2px solid ${TEAM_COLORS[i]}44` }}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Attribute sections */}
                        {visibleGroups.map(group => (
                            <div key={group.section} style={{ marginBottom: '2rem' }}>
                                {/* Section header */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: `2px solid ${group.color}33` }}>
                                    <span style={{ fontSize: '10px', fontWeight: 950, color: group.color, textTransform: 'uppercase', letterSpacing: '0.2em' }}>{group.section}</span>
                                    <div style={{ flex: 1, height: '1px', background: `${group.color}22` }} />
                                </div>

                                {group.attrs.map(attr => (
                                    <div
                                        key={attr.key}
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: `220px repeat(${comparedTeams.length}, minmax(160px, 1fr))`,
                                            gap: '1rem',
                                            minWidth: `${220 + comparedTeams.length * 160}px`,
                                            padding: '0.75rem 0',
                                            borderBottom: '1px solid rgba(255,255,255,0.03)',
                                            alignItems: 'center',
                                        }}
                                    >
                                        {/* Label */}
                                        <div>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#888' }}>
                                                {attr.icon} {attr.label}
                                            </span>
                                            {attr.description && (
                                                <p style={{ fontSize: '9px', color: '#444', marginTop: '0.15rem' }}>{attr.description}</p>
                                            )}
                                        </div>
                                        {/* Values per team */}
                                        {comparedTeams.map(t => (
                                            <div key={t.teamKey} style={{ textAlign: 'center' }}>
                                                {getAttrValue(t, attr)}
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        ))}

                        {/* Pit notes */}
                        {comparedTeams.some(t => t.pit?.otherNotes) && (
                            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                <p style={{ fontSize: '10px', fontWeight: 950, color: '#444', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '1rem' }}>
                                    PIT SCOUTER NOTES
                                </p>
                                <div style={{ display: 'grid', gridTemplateColumns: `220px repeat(${comparedTeams.length}, minmax(160px, 1fr))`, gap: '1rem', minWidth: `${220 + comparedTeams.length * 160}px` }}>
                                    <div />
                                    {comparedTeams.map(t => (
                                        <div key={t.teamKey}>
                                            {t.pit?.otherNotes ? (
                                                <p style={{ fontSize: '0.8rem', color: '#a855f7', lineHeight: 1.6, fontStyle: 'italic', background: 'rgba(168,85,247,0.05)', padding: '0.75rem', borderRadius: '10px', borderLeft: '2px solid rgba(168,85,247,0.3)' }}>
                                                    &ldquo;{t.pit.otherNotes}&rdquo;
                                                </p>
                                            ) : (
                                                <p style={{ fontSize: '0.8rem', color: '#333', fontStyle: 'italic' }}>No pit notes</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Summary insight cards */}
                {comparedTeams.length >= 2 && (
                    <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                        {/* Trench advantage */}
                        {comparedTeams.some(t => t.pit) && (() => {
                            const trenchTeams = comparedTeams.filter(t => yn(t.pit?.trench) === 'yes');
                            const noTrenchTeams = comparedTeams.filter(t => yn(t.pit?.trench) === 'no');
                            if (trenchTeams.length === 0 && noTrenchTeams.length === 0) return null;
                            const trenchAvgEPA = trenchTeams.length ? trenchTeams.reduce((a, t) => a + t.ourEPA, 0) / trenchTeams.length : 0;
                            const noTrenchAvgEPA = noTrenchTeams.length ? noTrenchTeams.reduce((a, t) => a + t.ourEPA, 0) / noTrenchTeams.length : 0;
                            return (
                                <div className="glass" style={{ padding: '1.5rem', borderRadius: '20px', borderLeft: '4px solid #3b82f6' }}>
                                    <p style={{ fontSize: '10px', fontWeight: 950, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.75rem' }}>🕳️ Trench Insight</p>
                                    <p style={{ fontSize: '0.85rem', color: '#ccc', lineHeight: 1.6 }}>
                                        {trenchTeams.length > 0 && <><b style={{ color: '#22c55e' }}>{trenchTeams.map(t => t.teamNum).join(', ')}</b> fit under the trench (avg EPA: {trenchAvgEPA.toFixed(1)}). </>}
                                        {noTrenchTeams.length > 0 && <><b style={{ color: '#ef4444' }}>{noTrenchTeams.map(t => t.teamNum).join(', ')}</b> cannot (avg EPA: {noTrenchAvgEPA.toFixed(1)}). </>}
                                        {trenchTeams.length > 0 && noTrenchTeams.length > 0 && (
                                            trenchAvgEPA > noTrenchAvgEPA
                                                ? `Trench-capable robots score ${(trenchAvgEPA - noTrenchAvgEPA).toFixed(1)} more pts/match on avg.`
                                                : `Trench capability doesn't correlate with higher EPA in this sample.`
                                        )}
                                    </p>
                                </div>
                            );
                        })()}

                        {/* Climb correlation */}
                        {comparedTeams.some(t => t.matchCount > 0) && (() => {
                            const climbers = comparedTeams.filter(t => t.climbMax >= 20);
                            const nonClimbers = comparedTeams.filter(t => t.climbMax < 20 && t.matchCount > 0);
                            if (climbers.length === 0) return null;
                            return (
                                <div className="glass" style={{ padding: '1.5rem', borderRadius: '20px', borderLeft: '4px solid #22c55e' }}>
                                    <p style={{ fontSize: '10px', fontWeight: 950, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.75rem' }}>🗼 Tower Insight</p>
                                    <p style={{ fontSize: '0.85rem', color: '#ccc', lineHeight: 1.6 }}>
                                        <b style={{ color: '#22c55e' }}>{climbers.map(t => t.teamNum).join(', ')}</b> achieve L{Math.max(...climbers.map(t => t.climbMax)) / 10}+ climbs.
                                        {nonClimbers.length > 0 && <> <b style={{ color: '#aaa' }}>{nonClimbers.map(t => t.teamNum).join(', ')}</b> currently do not climb reliably.</>}
                                        {` Avg tower pts: ${climbers.length ? (climbers.reduce((a, t) => a + t.avgTowerPts, 0) / climbers.length).toFixed(1) : 0} for climbers.`}
                                    </p>
                                </div>
                            );
                        })()}

                        {/* EPA vs pit quality */}
                        {comparedTeams.some(t => t.pit && t.matchCount > 0) && (() => {
                            const withBoth = comparedTeams.filter(t => t.pit && t.matchCount > 0);
                            if (withBoth.length < 2) return null;
                            const sorted = [...withBoth].sort((a, b) => b.ourEPA - a.ourEPA);
                            const best = sorted[0];
                            return (
                                <div className="glass" style={{ padding: '1.5rem', borderRadius: '20px', borderLeft: '4px solid var(--primary)' }}>
                                    <p style={{ fontSize: '10px', fontWeight: 950, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.75rem' }}>📊 Top Performer</p>
                                    <p style={{ fontSize: '0.85rem', color: '#ccc', lineHeight: 1.6 }}>
                                        <b style={{ color: 'var(--primary)' }}>{best.teamNum} — {best.name}</b> leads with EPA {best.ourEPA.toFixed(1)}.
                                        {best.pit && ` Robot quality: ${best.pit.robotQuality}/5. Drivetrain: ${best.pit.drivebase || 'unknown'}.`}
                                    </p>
                                </div>
                            );
                        })()}
                    </div>
                )}
            </div>

            {/* Field-wide population analysis — always visible */}
            <PopulationAnalysis teams={teams} />

        </main>
    );
}





