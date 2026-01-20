'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { runSimulation, TeamPerformanceDistribution, SimulatedMatch } from '@/lib/simulation';
import ReactMarkdown from 'react-markdown';

interface EventDashboardProps {
    eventKey: string;
    reports: any[];
    schedule: SimulatedMatch[];
    distributions: TeamPerformanceDistribution[];
    teamNameMap: Record<string, string>;
    aiSummary: string;
    tbaMatchesRaw: any[];
    actualRankings: any;
}

export default function EventDashboard({ eventKey, reports, schedule, distributions, teamNameMap, aiSummary, tbaMatchesRaw, actualRankings }: EventDashboardProps) {
    const maxMatch = useMemo(() => {
        const nums = schedule.map(m => parseInt(m.matchKey.split('_qm').pop() || '0'));
        return Math.max(...nums, 0);
    }, [schedule]);

    const [matchLimit, setMatchLimit] = useState(maxMatch);

    // 1. Calculate Ground Truth RPs (from TBA) up to matchLimit
    const groundTruthRPs = useMemo(() => {
        const rps: Record<string, number> = {};
        tbaMatchesRaw.forEach(m => {
            const mNum = parseInt(m.matchKey?.split('_qm').pop() || m.match_number?.toString() || '0');
            if (mNum <= matchLimit && m.alliances) {
                let redRPs = 0;
                let blueRPs = 0;

                if (m.score_breakdown) {
                    redRPs = m.score_breakdown.red.rp || 0;
                    blueRPs = m.score_breakdown.blue.rp || 0;
                } else {
                    const redScore = m.alliances.red.score;
                    const blueScore = m.alliances.blue.score;
                    redRPs = redScore > blueScore ? 2 : redScore === blueScore ? 1 : 0;
                    blueRPs = blueScore > redScore ? 2 : blueScore === redScore ? 1 : 0;
                }

                m.alliances.red.team_keys.forEach((t: string) => rps[t] = (rps[t] || 0) + redRPs);
                m.alliances.blue.team_keys.forEach((t: string) => rps[t] = (rps[t] || 0) + blueRPs);
            }
        });
        return rps;
    }, [tbaMatchesRaw, matchLimit]);

    // 2. Filter distributions based on matchLimit (Time-travel)
    const filteredDistributions = useMemo(() => {
        return distributions.map(d => ({
            ...d,
            pastSyntheticMatches: reports
                .filter(r => r.teamKey === d.teamKey && parseInt(r.matchKey.split('_qm').pop() || '0') <= matchLimit)
                .map(r => r.data)
        }));
    }, [distributions, reports, matchLimit]);

    // 3. Run Simulation (starting from Ground Truth RPs)
    const results = useMemo(() => {
        return runSimulation(filteredDistributions, schedule, groundTruthRPs, matchLimit);
    }, [filteredDistributions, schedule, groundTruthRPs, matchLimit]);

    const actualRankMap = useMemo(() => {
        const map: Record<string, number> = {};
        actualRankings?.rankings?.forEach((r: any) => {
            map[r.team_key] = r.rank;
        });
        return map;
    }, [actualRankings]);

    const topTeams = results.slice(0, 10).map((r, i) => ({
        teamKey: r.teamKey,
        team: r.teamKey.replace('frc', ''),
        name: teamNameMap[r.teamKey] || 'UNIT',
        expected: i + 1,
        actual: actualRankMap[r.teamKey] || '?',
        prob: `${((results.find(res => res.teamKey === r.teamKey)?.rankDistribution[1] || 0) / 10000 * 100).toFixed(0)}%`,
        rp: r.avgRP.toFixed(1)
    }));

    return (
        <main style={{ minHeight: '100vh', background: '#000', color: '#fff', padding: '4rem 2rem' }}>
            <div className="mx-auto" style={{ maxWidth: '1200px', display: 'grid', gap: '4rem' }}>

                <header className="flex flex-col md:flex-row justify-between items-start md:items-end reveal" style={{ gap: '2rem' }}>
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                        <div className="flex items-center" style={{ gap: '0.75rem' }}>
                            <div style={{ width: '0.75rem', height: '0.75rem', borderRadius: '50%', background: '#ff0000', boxShadow: '0 0 10px #ff0000' }}></div>
                            <p style={{ fontSize: '10px', fontWeight: 950, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#555' }}>Waco Mission Prediction</p>
                        </div>
                        <h1 className="text-gradient" style={{ fontSize: 'clamp(3rem, 10vw, 6rem)', fontWeight: 950, fontStyle: 'italic', letterSpacing: '-0.05em', lineHeight: 1 }}>
                            {eventKey.toUpperCase()}
                        </h1>
                        <p style={{ color: '#555', fontSize: '1.25rem', fontWeight: 500 }}>Monte Carlo Rank Integrity • {schedule.length} Matches Simulated</p>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <Link href={`/event/${eventKey}/draft`} style={{ textDecoration: 'none' }}>
                            <div className="glass" style={{ padding: '1rem 2rem', borderRadius: '100px', border: '1px solid var(--secondary)', background: 'rgba(57, 255, 20, 0.05)' }}>
                                <p style={{ fontSize: '9px', fontWeight: 950, color: 'var(--secondary)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                                    Launch Draft Advisor →
                                </p>
                            </div>
                        </Link>
                    </div>
                </header>

                {/* AI Event Intelligence */}
                <section className="reveal delay-1">
                    <div className="glass" style={{ padding: '2.5rem', borderRadius: '40px', borderTop: '4px solid var(--primary)', background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.05) 0%, transparent 100%)' }}>
                        <div className="flex items-center" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
                            <span style={{ fontSize: '10px', fontWeight: 950, color: 'var(--primary)', letterSpacing: '0.3em', textTransform: 'uppercase' }}>Strategic Synthesis</span>
                            <div style={{ height: '1px', flex: 1, background: 'rgba(168, 85, 247, 0.1)' }}></div>
                        </div>
                        <div className="ai-content" style={{ color: '#ccc', lineHeight: 1.8, fontSize: '1rem' }}>
                            <ReactMarkdown>{aiSummary}</ReactMarkdown>
                        </div>
                    </div>
                </section>

                {/* Simulation Control (Slider) */}
                <section className="reveal delay-2">
                    <div className="glass" style={{ padding: '2rem', borderRadius: '35px' }}>
                        <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '10px', fontWeight: 950, color: '#555', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Point-in-Time Mission Analysis</h3>
                            <span style={{ fontSize: '1.5rem', fontWeight: 950, fontStyle: 'italic', color: 'var(--primary)' }}>UP TO MATCH {matchLimit}</span>
                        </div>
                        <input
                            type="range" min="0" max={maxMatch} value={matchLimit}
                            onChange={(e) => setMatchLimit(parseInt(e.target.value))}
                            style={{ width: '100%', height: '8px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', accentColor: 'var(--primary)', cursor: 'pointer' }}
                        />
                        <div className="flex justify-between" style={{ marginTop: '0.5rem' }}>
                            <span style={{ fontSize: '9px', fontWeight: 900, color: '#333' }}>PRE-EVENT</span>
                            <span style={{ fontSize: '9px', fontWeight: 900, color: '#333' }}>CURRENT PROGRESS</span>
                        </div>
                    </div>
                </section>

                {/* Main Body Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '3rem' }}>

                    {/* Left: Leaderboard */}
                    <div style={{ gridColumn: 'span min(3, 4)', display: 'grid', gap: '2rem' }} className="reveal delay-3">
                        <div className="flex justify-between items-center" style={{ paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <h2 style={{ fontSize: '11px', fontWeight: 950, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#444', fontStyle: 'italic' }}>Simulated Leaderboard (Post-QM{matchLimit})</h2>
                            <span style={{ fontSize: '9px', fontWeight: 800, color: '#333' }}>DATA SAMPLES: {filteredDistributions.reduce((acc, d) => acc + d.pastSyntheticMatches.length, 0)}</span>
                        </div>

                        <div style={{ display: 'grid', gap: '1rem' }}>
                            {topTeams.map((p) => (
                                <Link key={p.teamKey} href={`/team/frc${p.team}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                    <div className="glass flex items-center" style={{ padding: '2rem', gap: '2rem', borderRadius: '30px' }}>
                                        <div style={{ textAlign: 'center' }}>
                                            <p style={{ fontSize: '10px', fontWeight: 950, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>SIM</p>
                                            <span style={{ fontSize: '3.5rem', fontWeight: 950, fontStyle: 'italic', color: '#fff' }}>#{p.expected}</span>
                                        </div>
                                        <div style={{ width: '1px', height: '3rem', background: 'rgba(255,255,255,0.1)' }}></div>
                                        <div style={{ textAlign: 'center' }}>
                                            <p style={{ fontSize: '10px', fontWeight: 950, color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em' }}>TBA</p>
                                            <span style={{ fontSize: '2.5rem', fontWeight: 950, fontStyle: 'italic', color: p.actual === p.expected ? 'var(--secondary)' : '#666' }}>#{p.actual}</span>
                                        </div>
                                        <div style={{ flex: 1, marginLeft: '1rem' }}>
                                            <p style={{ fontSize: '11px', fontWeight: 950, color: 'var(--primary)', letterSpacing: '0.15em' }}>MISSION TEAM {p.team}</p>
                                            <h3 style={{ fontSize: '2.25rem', fontWeight: 950, fontStyle: 'italic', textTransform: 'uppercase', color: '#fff', lineHeight: 1 }}>{p.name}</h3>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <p style={{ fontSize: '10px', fontWeight: 950, color: '#666', textTransform: 'uppercase' }}>EST. RP</p>
                                            <p style={{ fontSize: '2rem', fontWeight: 950, color: '#fff', fontFamily: 'monospace' }}>{p.rp}</p>
                                        </div>
                                        <div style={{ width: '1px', height: '3rem', background: 'rgba(255,255,255,0.1)' }}></div>
                                        <div style={{ textAlign: 'right', minWidth: '120px' }}>
                                            <p style={{ fontSize: '10px', fontWeight: 950, color: '#666', textTransform: 'uppercase' }}>TOP 1 PROB</p>
                                            <div style={{ fontSize: '2.5rem', fontWeight: 950, fontStyle: 'italic', color: 'var(--secondary)' }}>
                                                {p.prob}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Right: Insights */}
                    <div style={{ display: 'grid', gap: '2rem' }} className="reveal delay-4">
                        <section className="glass" style={{ padding: '2rem', borderRadius: '30px' }}>
                            <h3 style={{ fontSize: '10px', fontWeight: 950, color: '#555', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '1.5rem' }}>Simulation Health</h3>
                            <p style={{ fontSize: '0.875rem', color: '#888', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                                {matchLimit === 0
                                    ? "Pre-event baseline. Based on generic synthetic samples."
                                    : `Point-in-time snapshot using real data up to Match ${matchLimit}.`}
                            </p>
                            <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
                                <div style={{ height: '100%', borderRadius: '10px', background: '#22c55e', width: `${Math.min(100, (matchLimit / maxMatch) * 100)}%` }}></div>
                            </div>
                        </section>
                    </div>
                </div>

                {/* Tactical Schedule */}
                <div className="reveal delay-5" style={{ marginTop: '2rem' }}>
                    <div className="flex justify-between items-end" style={{ marginBottom: '2rem' }}>
                        <div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 950, fontStyle: 'italic', textTransform: 'uppercase' }}>Tactical Schedule</h2>
                            <p style={{ fontSize: '11px', color: '#444', fontWeight: 600 }}>MATCH-BY-MATCH AI STRATEGY GENERATION</p>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                        {schedule.map((m: any) => {
                            const mNum = parseInt(m.matchKey.split('_qm').pop() || '0');
                            const isPlayed = mNum <= matchLimit;
                            return (
                                <Link key={m.matchKey} href={`/match/${m.matchKey}`} style={{ textDecoration: 'none', opacity: isPlayed ? 0.3 : 1 }}>
                                    <div className="glass" style={{ padding: '1.5rem', borderRadius: '25px', border: isPlayed ? '1px solid rgba(255,255,255,0.02)' : '1px solid rgba(255,255,255,0.05)' }}>
                                        <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
                                            <span style={{ fontSize: '11px', fontWeight: 900, color: isPlayed ? '#444' : 'var(--primary)' }}>{m.matchKey.split('_').pop()?.toUpperCase() || 'QM?'}</span>
                                            {!isPlayed && <span style={{ fontSize: '9px', fontWeight: 950, color: '#444', textTransform: 'uppercase' }}>AI STRATEGY →</span>}
                                            {isPlayed && <span style={{ fontSize: '9px', fontWeight: 950, color: '#22c55e' }}>● COMPLETE</span>}
                                        </div>
                                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(239, 68, 68, 0.05)', padding: '0.5rem', borderRadius: '10px' }}>
                                                {m.red.map((t: string) => <span key={t} style={{ color: '#ef4444', fontSize: '12px', fontWeight: 900 }}>{t.replace('frc', '')}</span>)}
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(59, 130, 246, 0.05)', padding: '0.5rem', borderRadius: '10px' }}>
                                                {m.blue.map((t: string) => <span key={t} style={{ color: '#3b82f6', fontSize: '12px', fontWeight: 900 }}>{t.replace('frc', '')}</span>)}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>

            </div>
        </main>
    );
}
