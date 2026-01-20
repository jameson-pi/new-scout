import Link from 'next/link';
import { getMissionData } from '@/lib/data';
import { calculateSPR } from '@/lib/spr';

export default async function ScouterLeaderboard() {
    const { reports, tbaMatches } = await getMissionData();
    const scouterStats = calculateSPR(reports, tbaMatches);

    // Filter out scouters with very few matches to keep it clean
    const filteredStats = scouterStats
        .filter(s => s.matchesScouted > 0)
        .map(s => ({
            ...s,
            status: s.spr < 1.0 ? 'SYSTEM AI' : s.spr < 2.0 ? 'ELITE' : s.spr < 3.0 ? 'PRECISION' : 'RELIABLE',
            color: s.spr < 1.0 ? '#22c55e' : s.spr < 2.0 ? 'var(--primary)' : s.spr < 3.0 ? 'var(--secondary)' : 'var(--accent)'
        }));

    return (
        <main style={{ minHeight: '100vh', background: '#000', color: '#fff', padding: '4rem 2rem' }}>
            <div className="mx-auto" style={{ maxWidth: '1000px', display: 'grid', gap: '4rem' }}>

                {/* Cinematic Header */}
                <header className="flex flex-col reveal" style={{ gap: '1.5rem' }}>
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                        <Link href="/" style={{ fontSize: '9px', fontWeight: 950, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#444', textDecoration: 'none', marginBottom: '1rem', display: 'block' }}>
                            ← BACK TO MISSION CONTROL
                        </Link>
                        <h1 className="text-gradient" style={{ fontSize: 'clamp(3rem, 10vw, 6rem)', fontWeight: 950, fontStyle: 'italic', letterSpacing: '-0.05em', lineHeight: 1 }}>
                            SCOUTER<span className="text-primary">INTEL</span>
                        </h1>
                        <p style={{ color: '#555', fontSize: '1.25rem', fontWeight: 500 }}>Live Waco Performance • {filteredStats.length} Operatives Active</p>
                    </div>
                </header>

                {/* Scouter Grid */}
                <div style={{ display: 'grid', gap: '1rem' }} className="reveal delay-1">
                    <div className="flex justify-between items-center" style={{ padding: '0 2rem 1rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ fontSize: '10px', fontWeight: 950, color: '#333', textTransform: 'uppercase', letterSpacing: '0.2em' }}>OPERATIVE</span>
                        <div className="flex" style={{ gap: '4rem' }}>
                            <span style={{ fontSize: '10px', fontWeight: 950, color: '#333', textTransform: 'uppercase', letterSpacing: '0.2em', width: '80px', textAlign: 'right' }}>SPR SCORE</span>
                            <span style={{ fontSize: '10px', fontWeight: 950, color: '#333', textTransform: 'uppercase', letterSpacing: '0.2em', width: '80px', textAlign: 'right' }}>SAMPLES</span>
                        </div>
                    </div>

                    {filteredStats.map((s, i) => (
                        <div key={s.scoutId} className="glass" style={{ padding: '1.5rem 2rem', borderRadius: '30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
                            <div className="flex items-center" style={{ gap: '2rem' }}>
                                <span style={{ fontSize: '2rem', fontWeight: 950, fontStyle: 'italic', color: '#111', width: '40px' }}>{i + 1}</span>
                                <div>
                                    <p style={{ fontSize: '9px', fontWeight: 950, color: s.color, letterSpacing: '0.15em', marginBottom: '0.25rem' }}>{s.status}</p>
                                    <h3 style={{ fontSize: '1.5rem', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase' }}>{s.scoutId}</h3>
                                </div>
                            </div>

                            <div className="flex items-center" style={{ gap: '4rem' }}>
                                <div style={{ textAlign: 'right', width: '80px' }}>
                                    <p style={{ fontSize: '1.75rem', fontWeight: 950, fontStyle: 'italic', color: s.spr < 2.5 ? '#22c55e' : '#fff' }}>{s.spr.toFixed(2)}</p>
                                    <p style={{ fontSize: '9px', fontWeight: 950, color: '#444', textTransform: 'uppercase' }}>Precision</p>
                                </div>
                                <div style={{ textAlign: 'right', width: '80px' }}>
                                    <p style={{ fontSize: '1.75rem', fontWeight: 950, fontStyle: 'italic', color: '#fff' }}>{s.matchesScouted}</p>
                                    <p style={{ fontSize: '9px', fontWeight: 950, color: '#444', textTransform: 'uppercase' }}>Combos</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Scouter Breakdown Section */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }} className="reveal delay-2">
                    <section className="glass" style={{ padding: '2.5rem', borderRadius: '40px' }}>
                        <h3 style={{ fontSize: '10px', fontWeight: 950, color: '#555', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '1.5rem' }}>Dynamic SPR Model</h3>
                        <p style={{ color: '#888', lineHeight: 1.6, fontSize: '0.875rem' }}>
                            The Waco dataset contains <span style={{ color: '#fff' }}>{reports.length}</span> individual reports.
                            These rankings are generated by comparing every permutation of your scouts against real-time TBA results for <span style={{ color: '#fff' }}>{Object.keys(tbaMatches).length}</span> matches.
                        </p>
                    </section>

                    <section className="glass" style={{ padding: '2.5rem', borderRadius: '40px', borderLeft: '4px solid var(--secondary)' }}>
                        <h3 style={{ fontSize: '10px', fontWeight: 950, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '1.5rem' }}>Mission Integrity</h3>
                        <p style={{ color: '#888', lineHeight: 1.6, fontSize: '0.875rem' }}>
                            Operatives with high bias or variance are identified in Red. These scouts may require sensor re-calibration or additional training on Reefscape rules.
                        </p>
                    </section>
                </div>

            </div>
        </main>
    );
}
