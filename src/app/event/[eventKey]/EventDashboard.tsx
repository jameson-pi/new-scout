'use client';

import { useState, useMemo, memo, Suspense, lazy } from 'react';
import Link from 'next/link';
import { runSimulation, TeamPerformanceDistribution, SimulatedMatch } from '@/lib/simulation';
import { calculateTeamEPA } from '@/lib/spr';
import { ScoutReport } from '@/lib/types/scouting';
import { StatboticsTeamEvent } from '@/lib/statbotics';
import { predictUpcomingMatches } from '@/lib/predictions';
import { exportToCSV, ExportableTeam } from '@/lib/export';
import { TBAMatch } from '@/lib/tba';


interface TbaMatchLite {
    key?: string;
    matchKey?: string;
    match_number?: number;
    alliances?: {
        red: { score: number; team_keys: string[] };
        blue: { score: number; team_keys: string[] };
    };
    score_breakdown?: {
        red?: { rp?: number; [key: string]: any };
        blue?: { rp?: number; [key: string]: any };
    };
}

interface RankingsLite {
    rankings?: Array<{ team_key: string; rank: number }>;
}

type ReportWithMatchNum = ScoutReport & { matchNum: number };

interface EventDashboardProps {
    eventKey: string;
    reports: ScoutReport[];
    schedule: SimulatedMatch[];
    distributions: TeamPerformanceDistribution[];
    teamNameMap: Record<string, string>;
    aiSummary: string;
    tbaMatchesRaw: TBAMatch[];
    actualRankings: RankingsLite | null;
    statboticsData: StatboticsTeamEvent[];
}

export default function EventDashboard({ eventKey, reports, schedule, distributions, teamNameMap, aiSummary, tbaMatchesRaw, actualRankings, statboticsData }: EventDashboardProps) {
    void aiSummary;
    void actualRankings;

    const parsedReports = useMemo<ReportWithMatchNum[]>(() => {
        return reports.map((r) => ({
            ...r,
            matchNum: parseInt((r.matchKey || '').split('_qm').pop() || '0', 10),
        }));
    }, [reports]);

    const reportsByTeam = useMemo(() => {
        const map = new Map<string, ReportWithMatchNum[]>();
        parsedReports.forEach((report) => {
            const existing = map.get(report.teamKey);
            if (existing) existing.push(report);
            else map.set(report.teamKey, [report]);
        });
        return map;
    }, [parsedReports]);

    const statboticsByTeamNum = useMemo(() => {
        const map = new Map<number, StatboticsTeamEvent>();
        statboticsData.forEach((row) => map.set(row.team, row));
        return map;
    }, [statboticsData]);

    const maxMatch = useMemo(() => {
        const nums = schedule.map(m => parseInt(m.matchKey.split('_qm').pop() || '0'));
        return Math.max(...nums, 0);
    }, [schedule]);

    // Default to the highest match we actually have scouting data for,
    // so the countdown always points at real upcoming matches.
    const lastScoutedMatch = useMemo(() => {
        if (parsedReports.length === 0) return 0;
        return Math.max(...parsedReports.map(r => r.matchNum), 0);
    }, [parsedReports]);

    const [matchLimit, setMatchLimit] = useState(() => lastScoutedMatch);

    // 1. Calculate Ground Truth RPs (from TBA) up to matchLimit
    const groundTruthRPs = useMemo(() => {
        const rps: Record<string, number> = {};
        tbaMatchesRaw.forEach(m => {
            const mNum = m.match_number || 0;
            if (mNum <= matchLimit && m.alliances) {
                let redRPs = 0;
                let blueRPs = 0;

                if (m.score_breakdown) {
                    redRPs = (m.score_breakdown.red as any)?.rp || 0;
                    blueRPs = (m.score_breakdown.blue as any)?.rp || 0;
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
        return distributions.map(d => {
            const teamReports = reportsByTeam.get(d.teamKey) ?? [];
            return {
                ...d,
                pastSyntheticMatches: teamReports
                    .filter(r => r.matchNum <= matchLimit)
                    .map(r => r.data),
            };
        });
    }, [distributions, reportsByTeam, matchLimit]);

    // 2.5 Calculate Historical Rank Map (TBA Rank at Match Limit)
    const historicalRankMap = useMemo(() => {
        const sorted = Object.entries(groundTruthRPs)
            .sort((a, b) => b[1] - a[1])
            .map(([teamKey]) => teamKey);

        const map: Record<string, number> = {};
        sorted.forEach((teamKey, index) => {
            map[teamKey] = index + 1;
        });
        return map;
    }, [groundTruthRPs]);

    // 3. Run Simulation (starting from Ground Truth RPs)
    const results = useMemo(() => {
        return runSimulation(filteredDistributions, schedule, groundTruthRPs, matchLimit);
    }, [filteredDistributions, schedule, groundTruthRPs, matchLimit]);

    const resultsByTeam = useMemo(() => {
        const map = new Map<string, (typeof results)[number]>();
        results.forEach((row) => map.set(row.teamKey, row));
        return map;
    }, [results]);

    const topTeams = [...results].sort((a, b) => {
        const rA = historicalRankMap[a.teamKey] || 999;
        const rB = historicalRankMap[b.teamKey] || 999;
        return rA - rB;
    }).slice(0, 15).map((r) => {
        const teamNum = parseInt(r.teamKey.replace('frc', ''), 10);
        const sbData = statboticsByTeamNum.get(teamNum);
        const teamReports = (reportsByTeam.get(r.teamKey) ?? []).filter(rep => rep.matchNum <= matchLimit);
        const ourEPA = calculateTeamEPA(teamReports).toFixed(1);

        const simResult = resultsByTeam.get(r.teamKey);
        const top8Count = simResult
            ? Object.entries(simResult.rankDistribution)
                .filter(([rank]) => parseInt(rank, 10) <= 8)
                .reduce((acc, [, cnt]) => acc + cnt, 0)
            : 0;
        const top8Prob = (top8Count / 10000 * 100).toFixed(0);
        const simExpectedRank = simResult ? Math.round(simResult.expectedRank) : 999;

        return {
            teamKey: r.teamKey,
            team: r.teamKey.replace('frc', ''),
            name: teamNameMap[r.teamKey] || 'UNIT',
            expected: simExpectedRank,
            actual: historicalRankMap[r.teamKey] || '?',
            prob: `${top8Prob}%`,
            rp: r.avgRP.toFixed(1),
            ourEPA,
            sbEPA: sbData?.epa?.breakdown?.total_points?.toFixed(1) || 'N/A'
        };
    });

    // 4. Generate Match Predictions for upcoming matches
    const matchPredictions = useMemo(() => {
        return predictUpcomingMatches(schedule, filteredDistributions, matchLimit);
    }, [schedule, filteredDistributions, matchLimit]);

    const matchPredictionMap = useMemo(() => {
        const map: Record<string, (typeof matchPredictions)[number]> = {};
        matchPredictions.forEach((prediction) => {
            map[prediction.matchKey] = prediction;
        });
        return map;
    }, [matchPredictions]);

    // 5. Build a quick lookup for played match results (score + winner)
    const playedResultsMap = useMemo(() => {
        const map: Record<string, { redScore: number; blueScore: number; winner: 'red' | 'blue' | 'tie' }> = {};
        tbaMatchesRaw.forEach((m) => {
            const key = m.key;
            if (!key || !m.alliances) return;
            const redScore: number = m.alliances.red?.score ?? -1;
            const blueScore: number = m.alliances.blue?.score ?? -1;
            if (redScore < 0 || blueScore < 0) return;
            map[key] = {
                redScore,
                blueScore,
                winner: redScore > blueScore ? 'red' : blueScore > redScore ? 'blue' : 'tie',
            };
        });
        return map;
    }, [tbaMatchesRaw]);

    const epaCards = useMemo(() => {
        return Array.from(reportsByTeam.entries())
            .map(([teamKey, teamReports]) => {
                const teamNum = parseInt(teamKey.replace('frc', ''), 10);
                const ourEPAValue = calculateTeamEPA(teamReports);
                const ourEPA = ourEPAValue.toFixed(1);

                const sbData = statboticsByTeamNum.get(teamNum);
                const sbPoints = sbData?.epa?.breakdown?.total_points;
                const sbEPA = sbPoints != null ? sbPoints.toFixed(1) : 'N/A';

                const diffValue = sbPoints != null ? ourEPAValue - sbPoints : 0;
                const diff = diffValue.toFixed(1);
                const diffColor = diffValue > 0 ? '#22c55e' : diffValue < 0 ? '#ef4444' : '#888';

                return {
                    teamKey,
                    teamNum,
                    name: teamNameMap[teamKey] || 'TEAM',
                    ourEPA,
                    ourEPAValue,
                    sbEPA,
                    diff,
                    diffColor,
                };
            })
            .sort((a, b) => b.ourEPAValue - a.ourEPAValue);
    }, [reportsByTeam, statboticsByTeamNum, teamNameMap]);

    return (
        <main style={{ minHeight: '100vh', background: 'var(--background)', color: 'var(--foreground)', padding: 'clamp(5.5rem, 8vw, 2.5rem) clamp(1rem, 4vw, 1.25rem) 2rem', overflow: 'hidden' }}>
            <div className="mx-auto responsive-padding" style={{ maxWidth: '1200px', display: 'grid', gap: '2rem', width: '100%' }}>

                <header className="flex flex-col md:flex-row justify-between items-start md:items-end reveal mobile-stack" style={{ gap: '1.5rem' }}>
                    <div style={{ display: 'grid', gap: '0.6rem' }}>
                        <div className="flex items-center" style={{ gap: '0.75rem' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary-teal)', boxShadow: '0 0 12px var(--primary-teal)' }}></div>
                            <p style={{ fontSize: '11px', fontWeight: 950, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--primary-teal)' }}>⚙ {eventKey.split('2026')[1]?.toUpperCase() || eventKey.toUpperCase()} DASHBOARD</p>
                        </div>
                        <h1 style={{ fontSize: 'clamp(2.8rem, 10vw, 5.5rem)', fontWeight: 950, letterSpacing: '-0.03em', lineHeight: 1, background: 'linear-gradient(135deg, var(--primary-teal) 0%, var(--primary-brown) 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent' }}>
                            {eventKey.toUpperCase()}
                        </h1>
                        <p style={{ color: 'var(--muted)', fontSize: '1rem', fontWeight: 500 }}>Match simulation and point-in-time ranking view</p>
                    </div>

                    <div className="w-full md:w-auto event-header-actions" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <Link href={`/event/${eventKey}/teams`} style={{ textDecoration: 'none', flex: '1 1 auto', minWidth: '90px', maxWidth: '150px' }}>
                            <div className="glass" style={{ padding: '0.65rem 0.85rem', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.16)', background: 'rgba(255, 255, 255, 0.03)', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                <p style={{ fontSize: '9px', fontWeight: 650, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    Teams
                                </p>
                            </div>
                        </Link>
                        <Link href={`/scouters/${eventKey}`} style={{ textDecoration: 'none', flex: '1 1 auto', minWidth: '100px', maxWidth: '150px' }}>
                            <div className="glass" style={{ padding: '0.65rem 0.85rem', borderRadius: '999px', border: '1px solid rgba(124,109,216,0.35)', background: 'rgba(124,109,216,0.08)', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                <p style={{ fontSize: '9px', fontWeight: 650, color: 'var(--primary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    Scouter Intel
                                </p>
                            </div>
                        </Link>
                        <Link href={`/event/${eventKey}/draft`} style={{ textDecoration: 'none', flex: '1 1 auto', minWidth: '95px', maxWidth: '150px' }}>
                            <div className="glass" style={{ padding: '0.65rem 0.85rem', borderRadius: '999px', border: '1px solid rgba(79,174,192,0.35)', background: 'rgba(79,174,192,0.08)', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                <p style={{ fontSize: '9px', fontWeight: 650, color: 'var(--secondary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    Draft Advisor
                                </p>
                            </div>
                        </Link>
                        <Link href={`/event/${eventKey}/alliance-sim`} style={{ textDecoration: 'none', flex: '1 1 auto', minWidth: '105px', maxWidth: '150px' }}>
                            <div className="glass" style={{ padding: '0.65rem 0.85rem', borderRadius: '999px', border: '1px solid rgba(99,143,209,0.35)', background: 'rgba(99,143,209,0.08)', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                <p style={{ fontSize: '9px', fontWeight: 650, color: '#76a8df', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    Alliance Sim
                                </p>
                            </div>
                        </Link>
                        <Link href={`/event/${eventKey}/compare`} style={{ textDecoration: 'none', flex: 1 }}>
                            <div className="glass" style={{ padding: '0.75rem 1rem', borderRadius: '999px', border: '1px solid rgba(213,182,90,0.35)', background: 'rgba(213,182,90,0.08)', textAlign: 'center' }}>
                                <p style={{ fontSize: '10px', fontWeight: 650, color: '#d5b65a' }}>
                                    Compare
                                </p>
                            </div>
                        </Link>
                        <Link href="/quick-scout" style={{ textDecoration: 'none', flex: 1 }}>
                            <div className="glass" style={{ padding: '0.75rem 1rem', borderRadius: '999px', border: '1px solid rgba(205,93,116,0.35)', background: 'rgba(205,93,116,0.08)', textAlign: 'center' }}>
                                <p style={{ fontSize: '10px', fontWeight: 650, color: 'var(--accent)' }}>
                                    Quick Scout
                                </p>
                            </div>
                        </Link>
                        <Link href={`/event/${eventKey}/anomalies`} style={{ textDecoration: 'none', flex: 1 }}>
                            <div className="glass" style={{ padding: '0.75rem 1rem', borderRadius: '999px', border: '1px solid rgba(172,36,36,0.35)', background: 'rgba(172,36,36,0.08)', textAlign: 'center' }}>
                                <p style={{ fontSize: '10px', fontWeight: 650, color: 'var(--secondary-red)' }}>
                                    Anomalies
                                </p>
                            </div>
                        </Link>
                    </div>
                </header>


                {/* Simulation Control (Slider) */}
                <section className="reveal delay-2">
                    <div className="glass" style={{ padding: '1.4rem', borderRadius: '24px' }}>
                        <div className="flex justify-between items-center mobile-stack" style={{ marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Point-in-Time Analysis</h3>
                            <span style={{ fontSize: 'clamp(1.1rem, 4vw, 1.4rem)', fontWeight: 760, color: 'var(--primary)' }}>Up to Match {matchLimit}</span>
                        </div>
                        <input
                            type="range" min="0" max={maxMatch} value={matchLimit}
                            onChange={(e) => setMatchLimit(parseInt(e.target.value))}
                            style={{ width: '100%', height: '8px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', accentColor: 'var(--primary)', cursor: 'pointer' }}
                        />
                        <div className="flex justify-between" style={{ marginTop: '0.5rem' }}>
                            <span style={{ fontSize: '9px', fontWeight: 650, color: 'var(--muted)' }}>Pre-event</span>
                            <span style={{ fontSize: '9px', fontWeight: 650, color: 'var(--muted)' }}>Current</span>
                        </div>
                    </div>
                </section>

                {/* Main Body Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>

                    {/* Left: Leaderboard */}
                    <div style={{ gridColumn: 'span min(3, 4)', display: 'grid', gap: '2rem' }} className="reveal delay-3">
                        <div className="flex justify-between items-center" style={{ paddingBottom: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <div className="flex items-center gap-4">
                                <h2 style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>TBA Rankings (Match {matchLimit})</h2>
                                <button
                                    onClick={() => {
                                        const exportData: ExportableTeam[] = topTeams.map((t, index) => ({
                                            rank: index + 1,
                                            teamNumber: t.team,
                                            teamName: t.name,
                                            ourEPA: parseFloat(t.ourEPA),
                                            sbEPA: t.sbEPA === 'N/A' ? null : parseFloat(t.sbEPA),
                                            failureRate: 0, // Placeholder
                                            consistencyScore: 50, // Placeholder
                                            notes: ""
                                        }));
                                        exportToCSV(exportData, `${eventKey}_rankings`);
                                    }}
                                    className="glass-button"
                                    style={{
                                        padding: '0.4rem 0.8rem',
                                        fontSize: '9px',
                                        fontWeight: 950,
                                        color: 'var(--primary)',
                                        borderRadius: '10px',
                                        border: '1px solid rgba(124,109,216,0.5)',
                                        background: 'rgba(124,109,216,0.08)',
                                        cursor: 'pointer',
                                        textTransform: 'uppercase'
                                    }}
                                >
                                    Export CSV
                                </button>
                            </div>
                            <span style={{ fontSize: '9px', fontWeight: 650, color: 'var(--muted)' }}>Samples: {filteredDistributions.reduce((acc, d) => acc + d.pastSyntheticMatches.length, 0)}</span>
                        </div>

                        <div style={{ display: 'grid', gap: '0.85rem' }}>
                            {topTeams.map((p) => (
                                <Link key={p.teamKey} href={`/event/${eventKey}/team/${p.teamKey}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                    <div className="glass flex items-center leaderboard-card" style={{ padding: '1.2rem', gap: '1.25rem', borderRadius: '22px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                        <div className="flex items-center gap-8 rank-pill">
                                            <div style={{ textAlign: 'center' }}>
                                                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>TBA</p>
                                                <span style={{ fontSize: '2.2rem', fontWeight: 760, color: 'var(--foreground)' }}>#{p.actual}</span>
                                            </div>
                                            <div className="rank-divider" style={{ width: '1px', height: '2.3rem', background: 'rgba(255,255,255,0.12)' }}></div>
                                            <div style={{ textAlign: 'center' }}>
                                                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>SIM</p>
                                                <span style={{ fontSize: '1.8rem', fontWeight: 760, color: p.actual === p.expected ? 'var(--secondary)' : 'var(--muted)' }}>#{p.expected}</span>
                                            </div>
                                        </div>

                                        <div style={{ flex: 1 }}>
                                            <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.06em' }}>Team {p.team}</p>
                                            <h3 style={{ fontSize: 'clamp(1.1rem, 3vw, 1.5rem)', fontWeight: 720, color: 'var(--foreground)', lineHeight: 1.1 }}>{p.name}</h3>
                                        </div>

                                        <div className="flex items-center gap-8 mobile-stack">
                                            <div>
                                                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>Our EPA</p>
                                                <p style={{ fontSize: 'clamp(1.05rem, 3vw, 1.35rem)', fontWeight: 760, color: 'var(--foreground)', fontFamily: 'monospace' }}>{p.ourEPA}</p>
                                            </div>
                                            <div className="rank-divider" style={{ width: '1px', height: '2.2rem', background: 'rgba(255,255,255,0.12)' }}></div>
                                            <div>
                                                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>SB EPA</p>
                                                <p style={{ fontSize: 'clamp(1.05rem, 3vw, 1.35rem)', fontWeight: 700, color: '#d0d5de', fontFamily: 'monospace' }}>{p.sbEPA}</p>
                                            </div>
                                            <div className="rank-divider" style={{ width: '1px', height: '2.2rem', background: 'rgba(255,255,255,0.12)' }}></div>
                                            <div style={{ textAlign: 'right' }}>
                                                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Top 8</p>
                                                <div style={{ fontSize: 'clamp(1.1rem, 3vw, 1.5rem)', fontWeight: 760, color: 'var(--secondary)' }}>
                                                    {p.prob}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Right: Insights */}
                    <div style={{ display: 'grid', gap: '2rem' }} className="reveal delay-4">
                        <section className="glass" style={{ padding: '1.4rem', borderRadius: '22px' }}>
                            <h3 style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Simulation Health</h3>
                            <p style={{ fontSize: '0.86rem', color: '#c7ced7', lineHeight: 1.5, marginBottom: '1rem' }}>
                                {matchLimit === 0
                                    ? "Pre-event baseline. Based on generic synthetic samples."
                                    : `Point-in-time snapshot using real data up to Match ${matchLimit}.`}
                            </p>
                            <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px' }}>
                                <div style={{ height: '100%', borderRadius: '10px', background: '#84caa7', width: `${Math.min(100, (matchLimit / maxMatch) * 100)}%` }}></div>
                            </div>
                        </section>
                    </div>
                </div>

                {/* Tactical Schedule */}
                <div className="reveal delay-5" style={{ marginTop: '1rem' }}>
                    <div className="flex justify-between items-end" style={{ marginBottom: '1.5rem' }}>
                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 760, marginBottom: '0.5rem' }}>Match Schedule</h2>
                            <p style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>Per-match score and win probability view</p>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                        {schedule.map((m: SimulatedMatch) => {
                            const mNum = parseInt(m.matchKey.split('_qm').pop() || '0');
                            const isPlayed = mNum <= matchLimit;
                            const result = playedResultsMap[m.matchKey];
                            return (
                                <Link key={m.matchKey} href={`/match/${m.matchKey}`} style={{ textDecoration: 'none', opacity: isPlayed ? 0.75 : 1 }}>
                                    <div className="glass" style={{ padding: '1rem', borderRadius: '18px', border: isPlayed ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(255,255,255,0.1)' }}>
                                        <div className="flex justify-between items-center" style={{ marginBottom: '0.8rem' }}>
                                            <span style={{ fontSize: '11px', fontWeight: 700, color: isPlayed ? 'var(--muted)' : 'var(--primary)' }}>{m.matchKey.split('_').pop()?.toUpperCase() || 'QM?'}</span>
                                            {isPlayed && result ? (
                                                <span style={{
                                                    fontSize: '9px', fontWeight: 700, textTransform: 'uppercase',
                                                    color: result.winner === 'tie' ? '#d5b65a' : result.winner === 'red' ? '#cd5d74' : '#76a8df'
                                                }}>
                                                    {result.winner === 'tie' ? '⚖ TIE' : result.winner === 'red' ? '🔴 RED WIN' : '🔵 BLUE WIN'}
                                                </span>
                                            ) : isPlayed ? (
                                                <span style={{ fontSize: '9px', fontWeight: 700, color: '#84caa7' }}>Complete</span>
                                            ) : (
                                                <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Preview</span>
                                            )}
                                        </div>
                                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', background: isPlayed && result?.winner === 'red' ? 'rgba(205,93,116,0.14)' : 'rgba(205,93,116,0.08)', padding: '0.5rem', borderRadius: '10px' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    {m.red.map((t: string) => <span key={t} style={{ color: '#cd5d74', fontSize: '12px', fontWeight: 700 }}>{t.replace('frc', '')}</span>)}
                                                </div>
                                                {result && <span style={{ fontSize: '1rem', fontWeight: 760, color: result.winner === 'red' ? '#cd5d74' : 'var(--muted)', fontFamily: 'monospace' }}>{result.redScore}</span>}
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', background: isPlayed && result?.winner === 'blue' ? 'rgba(118,168,223,0.14)' : 'rgba(118,168,223,0.08)', padding: '0.5rem', borderRadius: '10px' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    {m.blue.map((t: string) => <span key={t} style={{ color: '#76a8df', fontSize: '12px', fontWeight: 700 }}>{t.replace('frc', '')}</span>)}
                                                </div>
                                                {result && <span style={{ fontSize: '1rem', fontWeight: 760, color: result.winner === 'blue' ? '#76a8df' : 'var(--muted)', fontFamily: 'monospace' }}>{result.blueScore}</span>}
                                            </div>
                                            {!isPlayed && (() => {
                                                const prediction = matchPredictionMap[m.matchKey];
                                                if (!prediction) return null;
                                                const confColor = prediction.confidence === 'high' ? '#22c55e' : prediction.confidence === 'medium' ? '#eab308' : '#ef4444';
                                                return (
                                                    <div style={{ marginTop: '0.45rem', padding: '0.65rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', borderLeft: `2px solid ${confColor}` }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                            <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Win Probability</span>
                                                            <span style={{ fontSize: '9px', fontWeight: 700, color: confColor, textTransform: 'uppercase' }}>{prediction.confidence}</span>
                                                        </div>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0.5rem', alignItems: 'center' }}>
                                                            <div style={{ textAlign: 'center' }}>
                                                                <div style={{ fontSize: '1.1rem', fontWeight: 760, color: '#cd5d74' }}>{(prediction.redWinProbability * 100).toFixed(0)}%</div>
                                                                <div style={{ fontSize: '9px', color: 'var(--muted)' }}>{prediction.redScoreRange.mean.toFixed(0)} pts</div>
                                                            </div>
                                                            <div style={{ fontSize: '10px', color: 'var(--muted)' }}>vs</div>
                                                            <div style={{ textAlign: 'center' }}>
                                                                <div style={{ fontSize: '1.1rem', fontWeight: 760, color: '#76a8df' }}>{(prediction.blueWinProbability * 100).toFixed(0)}%</div>
                                                                <div style={{ fontSize: '9px', color: 'var(--muted)' }}>{prediction.blueScoreRange.mean.toFixed(0)} pts</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                            {isPlayed && result && (() => {
                                                const prediction = matchPredictionMap[m.matchKey];
                                                if (!prediction) return null;
                                                const predictedWinner = prediction.redWinProbability >= prediction.blueWinProbability ? 'red' : 'blue';
                                                const correct = predictedWinner === result.winner || result.winner === 'tie';
                                                return (
                                                    <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Predicted</span>
                                                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                                            <span style={{ fontSize: '9px', fontWeight: 700, color: '#cd5d74' }}>{(prediction.redWinProbability * 100).toFixed(0)}%R</span>
                                                            <span style={{ fontSize: '9px', color: 'var(--muted)' }}>·</span>
                                                            <span style={{ fontSize: '9px', fontWeight: 700, color: '#76a8df' }}>{(prediction.blueWinProbability * 100).toFixed(0)}%B</span>
                                                            <span style={{ fontSize: '9px', fontWeight: 700, color: correct ? '#84caa7' : '#cd5d74' }}>{correct ? '✓' : '✗'}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* EPA Analysis Section */}
                <div className="reveal delay-6" style={{ marginTop: '1rem' }}>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 760, marginBottom: '1rem' }}>EPA Analysis (Our Data vs Statbotics)</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.85rem' }}>
                        {epaCards.map((card) => (
                            <div key={card.teamKey} className="glass" style={{ padding: '1.15rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <div className="flex justify-between items-center" style={{ marginBottom: '0.8rem' }}>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 760, color: 'var(--primary)' }}>{card.teamNum}</span>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--muted)' }}>{card.name}</span>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p style={{ fontSize: '9px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Our EPA</p>
                                        <p style={{ fontSize: '1.3rem', fontWeight: 760, color: 'var(--foreground)' }}>{card.ourEPA}</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '9px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Statbotics</p>
                                        <p style={{ fontSize: '1.3rem', fontWeight: 700, color: '#d0d5de' }}>{card.sbEPA}</p>
                                    </div>
                                </div>

                                <div style={{ marginTop: '0.8rem', paddingTop: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                                    <p style={{ fontSize: '9px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Difference</p>
                                    <p style={{ fontSize: '1rem', fontWeight: 760, color: card.diffColor }}>{parseFloat(card.diff) > 0 ? '+' : ''}{card.diff}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div >
        </main >
    );
}
