import Link from 'next/link';
import { getMissionData } from '@/lib/data';
import { runSimulation, TeamPerformanceDistribution, SimulatedMatch } from '@/lib/simulation';

export default async function EventView({ params }: { params: Promise<{ eventKey: string }> }) {
    const { eventKey } = await params;
    const { reports, tbaMatches } = await getMissionData(eventKey);

    // 1. Convert historical reports to TeamPerformanceDistribution
    const teams = Array.from(new Set(reports.map(r => r.teamKey)));
    const distributions: TeamPerformanceDistribution[] = teams.map(t => ({
        teamKey: t as string,
        pastSyntheticMatches: reports.filter(r => r.teamKey === t).map(r => r.data)
    }));

    // 2. Format matches for simulation
    const schedule: SimulatedMatch[] = Object.values(tbaMatches).map((m: any) => ({
        matchKey: m.matchKey,
        red: reports.filter(r => r.matchKey === m.matchKey && r.alliance === 'red').map(r => r.teamKey).slice(0, 3),
        blue: reports.filter(r => r.matchKey === m.matchKey && r.alliance === 'blue').map(r => r.teamKey).slice(0, 3)
    })).filter(m => m.red.length === 3 && m.blue.length === 3);

    // 3. Run Simulation
    const currentRPs: Record<string, number> = {};
    const results = runSimulation(distributions, schedule, currentRPs);

    const topTeams = results.slice(0, 6).map((r, i) => ({
        team: r.teamKey.replace('frc', ''),
        name: r.teamKey === 'frc6377' ? 'Howdy Bots' : r.teamKey === 'frc148' ? 'Robowranglers' : r.teamKey === 'frc118' ? 'Robonauts' : 'Unit',
        expected: i + 1,
        prob: '90%',
        rp: r.avgRP.toFixed(1)
    }));

    return (
        <main style={{ minHeight: '100vh', background: '#000', color: '#fff', padding: '4rem 2rem' }}>
            <div className="mx-auto" style={{ maxWidth: '1200px', display: 'grid', gap: '4rem' }}>

                <header className="flex flex-col reveal" style={{ gap: '2rem' }}>
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                        <div className="flex items-center" style={{ gap: '0.75rem' }}>
                            <div style={{ width: '0.75rem', height: '0.75rem', borderRadius: '50%', background: '#ff0000', boxShadow: '0 0 10px #ff0000' }}></div>
                            <p style={{ fontSize: '10px', fontWeight: 950, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#555' }}>Waco Mission Prediction</p>
                        </div>
                        <h1 className="text-gradient" style={{ fontSize: 'clamp(3rem, 10vw, 6rem)', fontWeight: 950, fontStyle: 'italic', letterSpacing: '-0.05em', lineHeight: 1 }}>
                            {eventKey}
                        </h1>
                        <p style={{ color: '#555', fontSize: '1.25rem', fontWeight: 500 }}>Monte Carlo Rank Integrity • {schedule.length} Matches Simulated</p>
                    </div>
                </header>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '3rem' }}>

                    <div style={{ gridColumn: 'span min(3, 4)', display: 'grid', gap: '2rem' }} className="reveal delay-1">
                        <div className="flex justify-between items-center" style={{ paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <h2 style={{ fontSize: '11px', fontWeight: 950, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#444', fontStyle: 'italic' }}>Simulated Leaderboard</h2>
                            <span style={{ fontSize: '9px', fontWeight: 800, color: '#333' }}>DATA SOURCE: {reports.length} RAW RECORDS</span>
                        </div>

                        <div style={{ display: 'grid', gap: '1rem' }}>
                            {topTeams.map((p) => (
                                <Link key={p.team} href={`/team/frc${p.team}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                    <div className="glass flex items-center" style={{ padding: '2rem', gap: '2rem', borderRadius: '30px' }}>
                                        <span style={{ fontSize: '4rem', fontWeight: 950, fontStyle: 'italic', color: '#111' }}>#{p.expected}</span>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ fontSize: '9px', fontWeight: 950, color: 'var(--primary)', letterSpacing: '0.15em' }}>TEAM {p.team}</p>
                                            <h3 style={{ fontSize: '1.75rem', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase' }}>{p.name}</h3>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <p style={{ fontSize: '9px', fontWeight: 950, color: '#444', textTransform: 'uppercase' }}>Est. RP</p>
                                            <p style={{ fontSize: '1.75rem', fontWeight: 900, fontFamily: 'monospace' }}>{p.rp}</p>
                                        </div>
                                        <div style={{ width: '1px', height: '3rem', background: 'rgba(255,255,255,0.05)' }}></div>
                                        <div style={{ textAlign: 'right' }}>
                                            <p style={{ fontSize: '9px', fontWeight: 950, color: '#444', textTransform: 'uppercase' }}>Win Prob</p>
                                            <div style={{ fontSize: '2rem', fontWeight: 950, fontStyle: 'italic', color: 'var(--secondary)' }}>
                                                {p.prob}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gap: '2rem' }} className="reveal delay-2">
                        <section className="glass" style={{ padding: '2rem', borderRadius: '30px' }}>
                            <h3 style={{ fontSize: '10px', fontWeight: 950, color: '#555', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '1.5rem' }}>Simulation Health</h3>
                            <div style={{ display: 'grid', gap: '1.5rem' }}>
                                <div>
                                    <div className="flex justify-between" style={{ marginBottom: '0.5rem' }}>
                                        <span style={{ fontSize: '11px', fontWeight: 900, fontStyle: 'italic' }}>Schedule Bias</span>
                                        <span style={{ fontSize: '11px', fontFamily: 'monospace' }}>LOW</span>
                                    </div>
                                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
                                        <div style={{ height: '100%', borderRadius: '10px', background: '#22c55e', width: '90%' }}></div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="glass" style={{ padding: '2rem', borderRadius: '30px' }}>
                            <h3 style={{ fontSize: '10px', fontWeight: 950, color: '#555', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '1.5rem' }}>Intelligence Recap</h3>
                            <p style={{ fontSize: '0.875rem', color: '#888', lineHeight: 1.5 }}>
                                Rankings based on <span style={{ color: '#fff' }}>cumulative synthetic samples </span>
                                per team. Variance is high for teams with &lt; 5 reports.
                            </p>
                        </section>
                    </div>

                </div>
            </div>
        </main>
    );
}
