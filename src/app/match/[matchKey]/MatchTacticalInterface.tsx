'use client';

import { useState, memo } from 'react';
import { getTacticalStrategy } from '@/lib/actions';
import ReactMarkdown from 'react-markdown';

interface PredictedMatchData {
    predictedPts: number;
    predictedAuto: number;
    predictedTele: number;
    predictedTower: number;
    sampleSize: number;
    variance?: number;
}

interface ActualMatchData {
    autoFuel: number;
    teleFuel: number;
    autoClimb: string;
    teleClimb: string;
    towerPts: number;
    autoMoved: boolean;
    mechFailure: boolean;
    defenderRating: number;
    notes: string;
    scoutedBy: string;
}

interface TeamProfile {
    teamKey: string;
    teamNum: string;
    avgAutoFuel: string;
    avgTeleopFuel: string;
    avgFuel: string;
    avgTowerPts: string;
    bestTowerLevel: string;
    autoMobility: string;
    autoFuel: string;
    towerRate: string;
    avgDefense: string;
    hubControl: string;
    trenchCapable: string;
    failures: number;
    notes: string;
    predicted: PredictedMatchData;
    actual: ActualMatchData | null;
    pit?: {
        drivebase?: string;
        climb?: string;
        hopperCapacity?: number | null;
        trench?: string;
        bump?: string;
        canLob?: string;
        turret?: string;
        shiftTracking?: string;
        pickupFloor?: string;
        pickupOutpost?: string;
        autoClimb?: string;
        robotQuality?: number;
        weightLbs?: number | null;
        heightIn?: number | null;
        otherNotes?: string;
    } | null;
}

interface TBAAllianceBreakdown {
    autoPoints: number | null;
    teleopPoints: number | null;
    endgamePoints: number | null;
    fuelPoints: number | null;
    autoFuelPoints: number | null;
    teleopFuelPoints: number | null;
    towerEndgamePoints: number | null;
    rp: number | null;
}

interface TBAResult {
    redScore: number;
    blueScore: number;
    winner: 'red' | 'blue' | 'tie';
    red: TBAAllianceBreakdown;
    blue: TBAAllianceBreakdown;
}

interface Props {
    matchKey: string;
    eventKey: string;
    redProfiles: TeamProfile[];
    blueProfiles: TeamProfile[];
    isPlayed: boolean;
    tbaResult: TBAResult | null;
    redPredicted: number;
    bluePredicted: number;
}

const CLIMB_LABEL: Record<string, string> = { Level3: 'L3 🏆', Level2: 'L2', Level1: 'L1', 'No Attempt': '—', None: '—' };

function AllianceBreakdown({
    profiles,
    alliance,
    tba,
    totalScore,
    eventKey,
}: {
    profiles: TeamProfile[];
    alliance: 'red' | 'blue';
    tba: TBAAllianceBreakdown | null;
    totalScore: number;
    eventKey: string;
}) {
    const color = alliance === 'red' ? '#ef4444' : '#3b82f6';
    const bgWin = alliance === 'red' ? 'rgba(239,68,68,0.07)' : 'rgba(59,130,246,0.07)';

    // Sum up what scouts recorded for this alliance in this match
    const scoutedAutoFuel = profiles.reduce((s, p) => s + (p.actual?.autoFuel ?? 0), 0);
    const scoutedTeleFuel = profiles.reduce((s, p) => s + (p.actual?.teleFuel ?? 0), 0);
    const scoutedTowerPts = profiles.reduce((s, p) => s + (p.actual?.towerPts ?? 0), 0);

    // Official fuel pts from TBA (auto + tele fuel combined)
    const tbaTotalFuelPts = (tba?.fuelPoints ?? ((tba?.autoFuelPoints ?? 0) + (tba?.teleopFuelPoints ?? 0)));
    // Tower pts are fixed (10/20/30) — don't scale those
    const tbaNonTowerScore = totalScore - scoutedTowerPts;
    const scoutedNonTowerPts = scoutedAutoFuel + scoutedTeleFuel;

    // Scale factor: if scouts overcounted fuel, compress each robot's fuel proportionally
    // so that scaled fuel totals + tower pts = TBA total score
    const fuelScaleFactor = (scoutedNonTowerPts > 0 && tbaNonTowerScore > 0)
        ? Math.min(1, tbaNonTowerScore / scoutedNonTowerPts)
        : 1;
    const isScaled = Math.abs(fuelScaleFactor - 1) > 0.02; // only show scale indicator if >2% off

    // Human player contribution = TBA fuel pts − scaled robot fuel
    const scaledTotalFuel = scoutedNonTowerPts * fuelScaleFactor;
    const humanPlayerFuel = Math.max(0, tbaTotalFuelPts - scaledTotalFuel);

    const scoutCoverage = profiles.filter(p => p.actual !== null).length;

    return (
        <div style={{ background: bgWin, borderRadius: '30px', padding: '2rem', border: `1px solid ${color}22` }}>
            {/* Alliance composition header */}
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <p style={{ fontSize: '8px', fontWeight: 950, color, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>Alliance Teams</p>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        {profiles.map(p => (
                            <div key={p.teamKey} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '1.1rem', fontWeight: 950, color: color }}>{p.teamNum}</span>
                                <span style={{ fontSize: '8px', fontWeight: 700, color: '#666' }}>
                                    {p.predicted.predictedPts}pts
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '8px', fontWeight: 950, color: '#666', textTransform: 'uppercase' }}>Total Predicted</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 950, color: color, fontFamily: 'monospace' }}>
                        {profiles.reduce((s, p) => s + p.predicted.predictedPts, 0)}pts
                    </p>
                </div>
            </div>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <p style={{ fontSize: '9px', fontWeight: 950, color, textTransform: 'uppercase', letterSpacing: '0.2em' }}>{alliance} alliance</p>
                    <p style={{ fontSize: '3rem', fontWeight: 950, fontStyle: 'italic', color, lineHeight: 1 }}>{totalScore}</p>
                    {tba?.rp != null && <p style={{ fontSize: '9px', color: '#888', fontWeight: 700 }}>{tba.rp} RP</p>}
                </div>
                <div style={{ textAlign: 'right' }}>
                    {scoutCoverage < profiles.length && (
                        <p style={{ fontSize: '9px', color: '#eab308', fontWeight: 900 }}>⚠ {scoutCoverage}/{profiles.length} SCOUTED</p>
                    )}
                    {isScaled && (
                        <p style={{ fontSize: '9px', color: '#a855f7', fontWeight: 900 }}>⚖ SCALED ×{fuelScaleFactor.toFixed(2)}</p>
                    )}
                    {tba && (
                        <div style={{ fontSize: '9px', color: '#666', lineHeight: 1.6 }}>
                            {tba.autoPoints != null && <div>Auto: <span style={{ color: '#aaa' }}>{tba.autoPoints}pts</span></div>}
                            {tba.teleopPoints != null && <div>Teleop: <span style={{ color: '#aaa' }}>{tba.teleopPoints}pts</span></div>}
                            {tba.endgamePoints != null && <div>Endgame: <span style={{ color: '#aaa' }}>{tba.endgamePoints}pts</span></div>}
                        </div>
                    )}
                </div>
            </div>

            {/* Per-robot rows */}
            <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.25rem' }}>
                {profiles.map(p => {
                    const a = p.actual;
                    const rawFuel = a ? a.autoFuel + a.teleFuel : 0;
                    const scaledFuel = Math.round(rawFuel * fuelScaleFactor);
                    const robotTotal = a ? scaledFuel + a.towerPts : null;
                    const rawTotal = a ? rawFuel + a.towerPts : null;
                    const pct = (robotTotal != null && totalScore > 0)
                        ? ((robotTotal / totalScore) * 100).toFixed(0)
                        : null;
                    return (
                        <a key={p.teamKey} href={`/event/${eventKey}/team/${p.teamKey}`}
                            style={{ textDecoration: 'none', color: 'inherit' }}>
                            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '18px', padding: '1rem 1.25rem', border: `1px solid ${a ? color + '33' : 'rgba(255,255,255,0.04)'}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: a ? '0.75rem' : 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <span style={{ fontSize: '1.25rem', fontWeight: 950, color }}>{p.teamNum}</span>
                                        {a?.mechFailure && <span style={{ fontSize: '8px', background: 'rgba(239,68,68,0.2)', color: '#ef4444', padding: '0.15rem 0.4rem', borderRadius: '5px', fontWeight: 900 }}>FAIL</span>}
                                        {a?.defenderRating && a.defenderRating > 0 && <span style={{ fontSize: '8px', background: 'rgba(234,179,8,0.15)', color: '#eab308', padding: '0.15rem 0.4rem', borderRadius: '5px', fontWeight: 900 }}>DEF {a.defenderRating}</span>}
                                        {!a && <span style={{ fontSize: '8px', color: '#444', fontWeight: 700 }}>not scouted this match</span>}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {robotTotal != null && (
                                            <span style={{ fontSize: '1.1rem', fontWeight: 950, color: '#fff', fontFamily: 'monospace' }}>
                                                {robotTotal}pts
                                            </span>
                                        )}
                                        {isScaled && rawTotal != null && rawTotal !== robotTotal && (
                                            <span style={{ fontSize: '8px', color: '#555', fontFamily: 'monospace' }}>({rawTotal} raw)</span>
                                        )}
                                        {/* Predicted score + diff */}
                                        <span style={{ fontSize: '8px', color: '#666', fontFamily: 'monospace' }}>
                                            pred <span style={{ color: '#a855f7' }}>{p.predicted.predictedPts}</span>
                                            {robotTotal != null && (
                                                <span style={{ color: Math.abs(robotTotal - p.predicted.predictedPts) < p.predicted.predictedPts * 0.2 ? '#22c55e' : '#eab308', marginLeft: '0.2rem' }}>
                                                    ({robotTotal >= p.predicted.predictedPts ? '+' : ''}{robotTotal - p.predicted.predictedPts})
                                                </span>
                                            )}
                                        </span>
                                        {pct != null && (
                                            <span style={{ fontSize: '9px', color: '#666', fontWeight: 700 }}>{pct}%</span>
                                        )}
                                    </div>
                                </div>

                                {a && (
                                    <>
                                        {/* Stat pills */}
                                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                                            <StatPill label="AUTO" value={`${Math.round(a.autoFuel * fuelScaleFactor)}⛽${isScaled ? ` (${a.autoFuel})` : ''}`} color={color} />
                                            <StatPill label="TELE" value={`${Math.round(a.teleFuel * fuelScaleFactor)}⛽${isScaled ? ` (${a.teleFuel})` : ''}`} color={color} />
                                            <StatPill label="TOWER" value={CLIMB_LABEL[a.teleClimb] ?? '—'} color={a.towerPts > 0 ? '#eab308' : '#444'} />
                                            {a.autoMoved && <StatPill label="" value="✓ AUTO MOV" color="#22c55e" />}
                                        </div>

                                        {/* Contribution bar — scaled pts vs TBA total */}
                                        {totalScore > 0 && robotTotal != null && (
                                            <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                                                <div style={{ height: '100%', borderRadius: '2px', background: color, width: `${Math.min(100, (robotTotal / totalScore) * 100)}%`, transition: 'width 0.5s ease' }} />
                                            </div>
                                        )}

                                        {/* Notes */}
                                        {a.notes && (
                                            <p style={{ fontSize: '0.7rem', color: '#666', fontStyle: 'italic', marginTop: '0.4rem', lineHeight: 1.4 }}>
                                                &ldquo;{a.notes}&rdquo;
                                                <span style={{ color: '#444', marginLeft: '0.4rem' }}>— {a.scoutedBy}</span>
                                            </p>
                                        )}
                                    </>
                                )}

                                {/* Avg + predicted fallback for unscouted */}
                                {!a && (
                                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                        <StatPill label="PRED" value={`${p.predicted.predictedPts}pts`} color="#a855f7" />
                                        <StatPill label="AVG AUTO" value={p.avgAutoFuel} color="#555" />
                                        <StatPill label="AVG TELE" value={p.avgTeleopFuel} color="#555" />
                                        <StatPill label="AVG TWR" value={p.avgTowerPts} color="#555" />
                                        {p.predicted.sampleSize > 0 && <StatPill label="n=" value={String(p.predicted.sampleSize)} color="#333" />}
                                    </div>
                                )}
                            </div>
                        </a>
                    );
                })}
            </div>

            {/* Human Player contribution row */}
            {scoutCoverage > 0 && humanPlayerFuel > 0 && (
                <div style={{ background: 'rgba(6,182,212,0.07)', borderRadius: '14px', padding: '0.75rem 1.25rem', border: '1px solid rgba(6,182,212,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{ fontSize: '0.9rem' }}>👤</span>
                        <div>
                            <p style={{ fontSize: '9px', fontWeight: 950, color: '#06b6d4', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Human Player</p>
                            <p style={{ fontSize: '8px', color: '#444' }}>TBA fuel − scouted robot fuel</p>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '1.1rem', fontWeight: 950, color: '#06b6d4', fontFamily: 'monospace' }}>~{humanPlayerFuel}pts</p>
                        <p style={{ fontSize: '8px', color: '#444' }}>{((humanPlayerFuel / totalScore) * 100).toFixed(0)}% of total</p>
                    </div>
                </div>
            )}

            {/* Scouted total vs TBA */}
            {scoutCoverage > 0 && tbaTotalFuelPts > 0 && (
                <div style={{ marginTop: '0.75rem', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '8px', fontWeight: 900, color: '#444', textTransform: 'uppercase' }}>Fuel accuracy</span>
                    <span style={{ fontSize: '8px', fontWeight: 950, color: Math.abs((scoutedAutoFuel + scoutedTeleFuel) - tbaTotalFuelPts) < tbaTotalFuelPts * 0.15 ? '#22c55e' : '#eab308' }}>
                        {scoutedAutoFuel + scoutedTeleFuel} scouted · {tbaTotalFuelPts} TBA fuel
                        {' '}({(scoutedAutoFuel + scoutedTeleFuel) >= tbaTotalFuelPts ? '+' : ''}{(scoutedAutoFuel + scoutedTeleFuel) - tbaTotalFuelPts} diff)
                    </span>
                </div>
            )}
        </div>
    );
}

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
    return (
        <span style={{ fontSize: '8px', fontWeight: 900, background: `${color}18`, color, padding: '0.2rem 0.5rem', borderRadius: '6px', whiteSpace: 'nowrap' }}>
            {label && <span style={{ opacity: 0.7, marginRight: '0.25rem' }}>{label}</span>}
            {value}
        </span>
    );
}

const MemoStatPill = memo(StatPill);

interface TeamDetailPanelProps {
    profile: TeamProfile;
    alliance: 'red' | 'blue';
    alliancemates: TeamProfile[];
    onClose: () => void;
}

function TeamDetailPanel({ profile, alliance, alliancemates, onClose }: TeamDetailPanelProps) {
    const color = alliance === 'red' ? '#ef4444' : '#3b82f6';
    const bgColor = alliance === 'red' ? 'rgba(239,68,68,0.08)' : 'rgba(59,130,246,0.08)';
    
    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '2rem'
        }} onClick={onClose}>
            <div style={{
                background: '#0a0a0d', border: `1px solid ${color}33`, borderRadius: '35px',
                maxWidth: '900px', width: '100%', maxHeight: '90vh', overflow: 'auto',
                padding: '3rem'
            }} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '2rem' }}>
                    <div>
                        <h2 style={{ fontSize: '3rem', fontWeight: 950, fontStyle: 'italic', color: color, lineHeight: 1 }}>
                            {profile.teamNum}
                        </h2>
                        <p style={{ fontSize: '9px', fontWeight: 950, color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.5rem' }}>
                            {alliance} alliance • tactical unit
                        </p>
                    </div>
                    <button onClick={onClose} style={{
                        background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#666'
                    }}>
                        ✕
                    </button>
                </div>

                {/* Predicted Score Breakdown */}
                <div style={{
                    background: bgColor, border: `1px solid ${color}22`, borderRadius: '20px',
                    padding: '1.5rem', marginBottom: '2rem'
                }}>
                    <p style={{ fontSize: '9px', fontWeight: 950, color, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
                        📊 PREDICTED PERFORMANCE
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem' }}>
                        <div>
                            <p style={{ fontSize: '8px', color: '#666', fontWeight: 700 }}>Total Score</p>
                            <p style={{ fontSize: '2rem', fontWeight: 950, color, fontFamily: 'monospace' }}>
                                {profile.predicted.predictedPts}
                            </p>
                        </div>
                        <div>
                            <p style={{ fontSize: '8px', color: '#666', fontWeight: 700 }}>Auto Fuel</p>
                            <p style={{ fontSize: '1.5rem', fontWeight: 950, color: '#06b6d4', fontFamily: 'monospace' }}>
                                {profile.predicted.predictedAuto}
                            </p>
                        </div>
                        <div>
                            <p style={{ fontSize: '8px', color: '#666', fontWeight: 700 }}>Teleop Fuel</p>
                            <p style={{ fontSize: '1.5rem', fontWeight: 950, color: '#22c55e', fontFamily: 'monospace' }}>
                                {profile.predicted.predictedTele}
                            </p>
                        </div>
                        <div>
                            <p style={{ fontSize: '8px', color: '#666', fontWeight: 700 }}>Tower Points</p>
                            <p style={{ fontSize: '1.5rem', fontWeight: 950, color: '#eab308', fontFamily: 'monospace' }}>
                                {profile.predicted.predictedTower}
                            </p>
                        </div>
                        <div>
                            <p style={{ fontSize: '8px', color: '#666', fontWeight: 700 }}>Sample Size</p>
                            <p style={{ fontSize: '1.5rem', fontWeight: 950, color: '#888' }}>
                                n={profile.predicted.sampleSize}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Alliance Composition */}
                <div style={{
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px',
                    padding: '1.5rem', marginBottom: '2rem'
                }}>
                    <p style={{ fontSize: '9px', fontWeight: 950, color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
                        👥 ALLIANCE COMPOSITION
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                        {alliancemates.map((mate) => (
                            <div key={mate.teamKey} style={{
                                background: mate.teamKey === profile.teamKey ? `${color}22` : 'rgba(0,0,0,0.2)',
                                border: mate.teamKey === profile.teamKey ? `1px solid ${color}` : '1px solid rgba(255,255,255,0.05)',
                                borderRadius: '15px', padding: '1rem', textAlign: 'center'
                            }}>
                                <p style={{ fontSize: '1.5rem', fontWeight: 950, color: mate.teamKey === profile.teamKey ? color : '#fff' }}>
                                    {mate.teamNum}
                                </p>
                                <p style={{ fontSize: '8px', color: '#666', fontWeight: 700 }}>
                                    {mate.predicted.predictedPts}pts
                                </p>
                                <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                                    {[
                                        { icon: '⛽', val: (parseFloat(mate.avgAutoFuel) + parseFloat(mate.avgTeleopFuel)).toFixed(0) },
                                        { icon: '🏔', val: mate.avgTowerPts },
                                        { icon: '📍', val: mate.trenchCapable === 'Yes' ? '✓' : '✕' }
                                    ].map((stat, i) => (
                                        <span key={i} style={{ fontSize: '7px', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>
                                            {stat.icon} {stat.val}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Historical Performance */}
                <div style={{
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px',
                    padding: '1.5rem', marginBottom: '2rem'
                }}>
                    <p style={{ fontSize: '9px', fontWeight: 950, color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
                        📈 HISTORICAL STATS
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
                        {[
                            { label: 'Avg Fuel', val: parseFloat(profile.avgFuel).toFixed(1), suffix: '⛽' },
                            { label: 'Auto Fuel', val: profile.avgAutoFuel, suffix: '⛽' },
                            { label: 'Teleop Fuel', val: profile.avgTeleopFuel, suffix: '⛽' },
                            { label: 'Tower Points', val: profile.avgTowerPts, suffix: 'pts' },
                            { label: 'Tower %', val: profile.towerRate, suffix: '%' },
                            { label: 'Defense Avg', val: profile.avgDefense, suffix: '/10' },
                            { label: 'Auto Mobility', val: profile.autoMobility, suffix: '%' },
                            { label: 'Failures', val: String(profile.failures), suffix: 'x' },
                        ].map(({ label, val, suffix }) => (
                            <div key={label} style={{
                                background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '1rem', textAlign: 'center'
                            }}>
                                <p style={{ fontSize: '8px', color: '#888', fontWeight: 700 }}>{label}</p>
                                <p style={{ fontSize: '1.5rem', fontWeight: 950, color: '#fff' }}>
                                    {val}{suffix}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Pit Scouting Details */}
                {profile.pit && (
                    <div style={{
                        background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '20px',
                        padding: '1.5rem', marginBottom: '2rem'
                    }}>
                        <p style={{ fontSize: '9px', fontWeight: 950, color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
                            🔧 PIT SCOUTING
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                            {[
                                { label: 'Drivebase', val: profile.pit.drivebase },
                                { label: 'Max Climb', val: profile.pit.climb },
                                { label: 'Hopper Capacity', val: profile.pit.hopperCapacity ? `${profile.pit.hopperCapacity}` : 'N/A' },
                                { label: 'Trench Capable', val: profile.pit.trench },
                                { label: 'Bump Strategy', val: profile.pit.bump },
                                { label: 'Can Lob', val: profile.pit.canLob },
                                { label: 'Turret', val: profile.pit.turret },
                                { label: 'Shift Tracking', val: profile.pit.shiftTracking },
                                { label: 'Floor Pickup', val: profile.pit.pickupFloor },
                                { label: 'Outpost Pickup', val: profile.pit.pickupOutpost },
                                { label: 'Auto Climb', val: profile.pit.autoClimb },
                                { label: 'Robot Quality', val: profile.pit.robotQuality ? `${profile.pit.robotQuality}/5` : 'N/A' },
                                { label: 'Weight', val: profile.pit.weightLbs ? `${profile.pit.weightLbs}lbs` : 'N/A' },
                                { label: 'Height', val: profile.pit.heightIn ? `${profile.pit.heightIn}in` : 'N/A' },
                            ].filter(item => item.val && item.val !== 'N/A').map(({ label, val }) => (
                                <div key={label}>
                                    <p style={{ fontSize: '8px', color: '#a855f7', fontWeight: 700 }}>{label}</p>
                                    <p style={{ fontSize: '0.95rem', color: '#ccc', fontWeight: 700 }}>{val}</p>
                                </div>
                            ))}
                        </div>
                        {profile.pit.otherNotes && (
                            <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '12px' }}>
                                <p style={{ fontSize: '8px', color: '#888', fontWeight: 700, marginBottom: '0.5rem' }}>Additional Notes</p>
                                <p style={{ fontSize: '0.9rem', color: '#ddd', lineHeight: 1.6 }}>{profile.pit.otherNotes}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Field Notes */}
                {profile.notes && (
                    <div style={{
                        background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '20px',
                        padding: '1.5rem'
                    }}>
                        <p style={{ fontSize: '9px', fontWeight: 950, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
                            📝 SCOUTER NOTES
                        </p>
                        <p style={{ fontSize: '0.95rem', color: '#ddd', lineHeight: 1.8 }}>{profile.notes}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function MatchTacticalInterface({ matchKey, eventKey, redProfiles, blueProfiles, isPlayed, tbaResult, redPredicted, bluePredicted }: Props) {
    const [selectedAlliance, setSelectedAlliance] = useState<'red' | 'blue'>('red');
    const [manualNotes, setManualNotes] = useState<Record<string, string>>({});
    const [briefing, setBriefing] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [view, setView] = useState<'breakdown' | 'strategy'>(isPlayed ? 'breakdown' : 'strategy');
    const [selectedTeam, setSelectedTeam] = useState<{ profile: TeamProfile; alliance: 'red' | 'blue' } | null>(null);

    const activeProfiles = selectedAlliance === 'red' ? redProfiles : blueProfiles;
    const opponentProfiles = selectedAlliance === 'red' ? blueProfiles : redProfiles;

    const handleGenerate = async () => {
        setIsLoading(true);
        setBriefing(null);
        const updatedAllianceData = activeProfiles.map(p => ({
            ...p,
            notes: manualNotes[p.teamKey] ? `${p.notes} [OVERRIDE: ${manualNotes[p.teamKey]}]` : p.notes
        }));
        const result = await getTacticalStrategy(matchKey, selectedAlliance, updatedAllianceData as any, opponentProfiles as any);
        setBriefing(result);
        setIsLoading(false);
    };

    return (
        <div style={{ display: 'grid', gap: '3rem' }}>

            {/* View toggle for played matches */}
            {isPlayed && (
                <section className="reveal">
                    <div className="glass" style={{ padding: '1rem', borderRadius: '20px', display: 'flex', gap: '0.5rem', width: 'fit-content' }}>
                        {(['breakdown', 'strategy'] as const).map(v => (
                            <button key={v} onClick={() => setView(v)} style={{
                                padding: '0.6rem 1.5rem', borderRadius: '12px', border: 'none', fontWeight: 950, fontSize: '11px', cursor: 'pointer', letterSpacing: '0.05em', textTransform: 'uppercase',
                                background: view === v ? 'var(--primary)' : 'transparent',
                                color: view === v ? '#000' : '#555',
                            }}>
                                {v === 'breakdown' ? '📊 Match Breakdown' : '🧠 Strategy View'}
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {/* ── PLAYED MATCH BREAKDOWN ── */}
            {isPlayed && view === 'breakdown' && tbaResult && (
                <section className="reveal delay-1">
                    {/* Scoreboard */}
                    <div className="glass" style={{ padding: '1.5rem 2rem', borderRadius: '25px', marginBottom: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2rem' }}>
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: '9px', fontWeight: 950, color: '#ef4444', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Red Alliance</p>
                            <p style={{ fontSize: '3.5rem', fontWeight: 950, fontStyle: 'italic', color: tbaResult.winner === 'red' ? '#ef4444' : '#888', lineHeight: 1 }}>{tbaResult.redScore}</p>
                            <p style={{ fontSize: '9px', color: '#555', fontWeight: 700 }}>
                                pred <span style={{ color: Math.abs(redPredicted - tbaResult.redScore) < tbaResult.redScore * 0.15 ? '#22c55e' : '#eab308' }}>{redPredicted}</span>
                                {' '}<span style={{ color: '#444' }}>({redPredicted >= tbaResult.redScore ? '+' : ''}{redPredicted - tbaResult.redScore})</span>
                            </p>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: '1rem', fontWeight: 950, color: '#444' }}>VS</p>
                            <p style={{ fontSize: '9px', fontWeight: 950, color: tbaResult.winner === 'tie' ? '#eab308' : tbaResult.winner === 'red' ? '#ef4444' : '#3b82f6', marginTop: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                {tbaResult.winner === 'tie' ? '⚖ TIE' : `${tbaResult.winner.toUpperCase()} WINS`}
                            </p>
                            <p style={{ fontSize: '8px', color: '#333', marginTop: '0.5rem' }}>PRED {redPredicted} – {bluePredicted}</p>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: '9px', fontWeight: 950, color: '#3b82f6', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Blue Alliance</p>
                            <p style={{ fontSize: '3.5rem', fontWeight: 950, fontStyle: 'italic', color: tbaResult.winner === 'blue' ? '#3b82f6' : '#888', lineHeight: 1 }}>{tbaResult.blueScore}</p>
                            <p style={{ fontSize: '9px', color: '#555', fontWeight: 700 }}>
                                pred <span style={{ color: Math.abs(bluePredicted - tbaResult.blueScore) < tbaResult.blueScore * 0.15 ? '#22c55e' : '#eab308' }}>{bluePredicted}</span>
                                {' '}<span style={{ color: '#444' }}>({bluePredicted >= tbaResult.blueScore ? '+' : ''}{bluePredicted - tbaResult.blueScore})</span>
                            </p>
                        </div>
                    </div>

                    {/* Alliance breakdowns side by side */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
                        <AllianceBreakdown profiles={redProfiles} alliance="red" tba={tbaResult.red} totalScore={tbaResult.redScore} eventKey={eventKey} />
                        <AllianceBreakdown profiles={blueProfiles} alliance="blue" tba={tbaResult.blue} totalScore={tbaResult.blueScore} eventKey={eventKey} />
                    </div>
                </section>
            )}

            {/* ── STRATEGY VIEW (upcoming OR toggle on played) ── */}
            {(!isPlayed || view === 'strategy') && (
                <>
                    {/* Alliance Control Center */}
                    <section className="reveal delay-1">
                        <div className="glass" style={{ padding: '2rem', borderRadius: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <p style={{ fontSize: '10px', fontWeight: 950, color: '#888', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '0.5rem' }}>Tactical Focus</p>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 950, fontStyle: 'italic', textTransform: 'uppercase' }}>Alliance Selection</h2>
                            </div>
                            <div className="flex gap-4" style={{ background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '100px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                {(['red', 'blue'] as const).map(a => (
                                    <button key={a} onClick={() => setSelectedAlliance(a)} style={{
                                        padding: '0.75rem 2rem', borderRadius: '100px', border: 'none',
                                        background: selectedAlliance === a ? (a === 'red' ? '#ef4444' : '#3b82f6') : 'transparent',
                                        color: selectedAlliance === a ? '#fff' : '#444',
                                        fontWeight: 950, fontSize: '12px', cursor: 'pointer', transition: 'all 0.3s ease', textTransform: 'uppercase',
                                    }}>{a} Alliance</button>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Team Scoring Dashboard */}
                    <section className="reveal delay-2">
                        <div className="flex items-center gap-4" style={{ marginBottom: '2rem' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: selectedAlliance === 'red' ? '#ef4444' : '#3b82f6', boxShadow: `0 0 10px ${selectedAlliance === 'red' ? '#ef4444' : '#3b82f6'}` }}></div>
                            <h3 style={{ fontSize: '11px', fontWeight: 950, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#444' }}>Allied Unit Readiness</h3>
                            <div style={{ marginLeft: 'auto', display: 'flex', gap: '1.5rem' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <p style={{ fontSize: '8px', fontWeight: 900, color: '#ef4444', textTransform: 'uppercase' }}>Red Pred</p>
                                    <p style={{ fontSize: '1rem', fontWeight: 950, color: '#ef4444', fontFamily: 'monospace' }}>{redPredicted}</p>
                                </div>
                                <div style={{ fontSize: '10px', color: '#333', alignSelf: 'center' }}>vs</div>
                                <div style={{ textAlign: 'center' }}>
                                    <p style={{ fontSize: '8px', fontWeight: 900, color: '#3b82f6', textTransform: 'uppercase' }}>Blue Pred</p>
                                    <p style={{ fontSize: '1rem', fontWeight: 950, color: '#3b82f6', fontFamily: 'monospace' }}>{bluePredicted}</p>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                            {activeProfiles.map((p) => (
                                <div
                                    key={p.teamKey}
                                    onClick={() => setSelectedTeam({ profile: p, alliance: selectedAlliance })}
                                    className="glass"
                                    style={{ padding: '2rem', borderRadius: '35px', borderLeft: `4px solid ${selectedAlliance === 'red' ? '#ef4444' : '#3b82f6'}33`, cursor: 'pointer', transition: 'all 0.3s ease', position: 'relative', overflow: 'hidden' }}
                                    onMouseEnter={(e) => {
                                        const el = e.currentTarget as HTMLElement;
                                        el.style.borderLeftColor = selectedAlliance === 'red' ? '#ef4444' : '#3b82f6';
                                        el.style.transform = 'translateY(-4px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        const el = e.currentTarget as HTMLElement;
                                        el.style.borderLeftColor = selectedAlliance === 'red' ? '#ef444433' : '#3b82f633';
                                        el.style.transform = 'translateY(0)';
                                    }}
                                >
                                    {/* Click indicator */}
                                    <div style={{
                                        position: 'absolute', top: '1rem', right: '1rem',
                                        fontSize: '10px', color: '#666', fontWeight: 700
                                    }}>
                                        CLICK FOR DETAILS
                                    </div>
                                    <div className="flex justify-between items-start" style={{ marginBottom: '1.5rem' }}>
                                        <div>
                                            <h4 style={{ fontSize: '2.5rem', fontWeight: 950, fontStyle: 'italic', color: '#fff', lineHeight: 1 }}>{p.teamNum}</h4>
                                            <p style={{ fontSize: '9px', fontWeight: 950, color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Tactical Unit</p>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '1.25rem', fontWeight: 950, color: '#a855f7', fontFamily: 'monospace', lineHeight: 1 }}>
                                                {p.predicted.predictedPts}pts
                                            </div>
                                            <p style={{ fontSize: '8px', color: '#555', fontWeight: 700 }}>
                                                {p.predicted.predictedAuto}a + {p.predicted.predictedTele}t + {p.predicted.predictedTower}e
                                                {p.predicted.sampleSize > 0 && <span style={{ color: '#333', marginLeft: '0.25rem' }}>n={p.predicted.sampleSize}</span>}
                                            </p>
                                            <p style={{ fontSize: '9px', fontWeight: 950, color: '#aaa', marginTop: '0.25rem' }}>HUB: {p.hubControl?.toUpperCase()}</p>
                                            {p.pit && <span style={{ fontSize: '8px', fontWeight: 950, background: 'rgba(168,85,247,0.2)', color: '#a855f7', padding: '0.15rem 0.4rem', borderRadius: '6px', marginTop: '0.3rem', display: 'inline-block' }}>PIT ✓</span>}
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                                        {[
                                            { label: 'AUTO FUEL', val: p.avgAutoFuel },
                                            { label: 'TELE FUEL', val: p.avgTeleopFuel },
                                            { label: 'TOWER PTS', val: p.avgTowerPts },
                                            { label: 'TOWER %', val: `${p.towerRate}%` },
                                            { label: 'TRENCH', val: p.trenchCapable, color: p.trenchCapable === 'Yes' ? '#22c55e' : '#666' },
                                            { label: 'DEFENSE', val: p.avgDefense },
                                        ].map(({ label, val, color }) => (
                                            <div key={label} style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '15px', textAlign: 'center' }}>
                                                <p style={{ fontSize: '7px', fontWeight: 950, color: '#888' }}>{label}</p>
                                                <p style={{ fontSize: '1.25rem', fontWeight: 950, color: color ?? '#fff' }}>{val}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {p.pit && (
                                        <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(168,85,247,0.06)', borderRadius: '12px', border: '1px solid rgba(168,85,247,0.15)' }}>
                                            <p style={{ fontSize: '8px', fontWeight: 950, color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>Pit Intel</p>
                                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                                {p.pit.drivebase && <StatPill label="" value={p.pit.drivebase} color="#888" />}
                                                {p.pit.climb && p.pit.climb !== 'No Attempt' && <StatPill label="Max" value={p.pit.climb} color="#eab308" />}
                                                {p.pit.hopperCapacity != null && <StatPill label="Hopper" value={String(p.pit.hopperCapacity)} color="#c084fc" />}
                                                {p.pit.turret === 'Yes' && <StatPill label="" value="Turret" color="#22c55e" />}
                                                {p.pit.canLob === 'Yes' && <StatPill label="" value="Lob" color="#06b6d4" />}
                                                {p.pit.robotQuality != null && <StatPill label="Quality" value={`${p.pit.robotQuality}/5`} color="#aaa" />}
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <p style={{ fontSize: '8px', fontWeight: 950, color: selectedAlliance === 'red' ? '#ef4444' : '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>Intelligence Overrides</p>
                                        <textarea
                                            placeholder="Enter field observations..."
                                            value={manualNotes[p.teamKey] || ''}
                                            onChange={(e) => setManualNotes({ ...manualNotes, [p.teamKey]: e.target.value })}
                                            style={{ width: '100%', height: '80px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '15px', padding: '1rem', color: '#ccc', fontSize: '11px', resize: 'none', fontFamily: 'inherit' }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* AI Generation */}
                    <section className="reveal delay-3 flex flex-col items-center" style={{ marginTop: '2rem' }}>
                        <button onClick={handleGenerate} disabled={isLoading} className="generate-btn" style={{
                            padding: '2rem 5rem', borderRadius: '100px', border: '2px solid var(--primary-teal)',
                            background: isLoading ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, var(--primary-teal) 0%, var(--primary-brown) 100%)',
                            color: isLoading ? '#666' : '#000', fontWeight: 950, fontSize: '16px', letterSpacing: '0.15em', textTransform: 'uppercase',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            boxShadow: isLoading ? 'none' : '0 0 40px rgba(0, 204, 204, 0.5), 0 15px 50px rgba(0, 204, 204, 0.2)', transition: 'all 0.3s ease',
                        }}>
                            {isLoading ? '⚙ PROCESSING INTELLIGENCE...' : '⚡ GENERATE TACTICAL BRIEFING'}
                        </button>

                        {briefing && (
                            <div className="glass reveal" style={{ marginTop: '4rem', padding: '3.5rem', borderRadius: '45px', background: 'linear-gradient(135deg, rgba(34,197,94,0.05) 0%, transparent 100%)', borderTop: '1px solid rgba(34,197,94,0.1)', width: '100%' }}>
                                <div className="flex items-center gap-4" style={{ marginBottom: '2.5rem' }}>
                                    <div style={{ width: '10px', height: '10px', background: '#22c55e', borderRadius: '2px' }}></div>
                                    <span style={{ fontSize: '11px', fontWeight: 950, color: '#22c55e', letterSpacing: '0.3em', textTransform: 'uppercase' }}>Strategic Resolution Active</span>
                                </div>
                                <div className="briefing-content" style={{ fontSize: '1.2rem', color: '#eee', lineHeight: 1.8 }}>
                                    <ReactMarkdown>{briefing}</ReactMarkdown>
                                </div>
                            </div>
                        )}
                    </section>
                </>
            )}

            {/* Team Detail Panel Modal */}
            {selectedTeam && (
                <TeamDetailPanel
                    profile={selectedTeam.profile}
                    alliance={selectedTeam.alliance}
                    alliancemates={selectedTeam.alliance === 'red' ? redProfiles : blueProfiles}
                    onClose={() => setSelectedTeam(null)}
                />
            )}
        </div>
    );
}
