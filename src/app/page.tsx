import Link from 'next/link';
import { getMissionData } from '@/lib/data';

const DEFAULT_EVENT = '2025txwac';

export default async function Home() {
  let matchCount = 0;
  let reportCount = 0;
  try {
    const { reports, tbaMatches } = await getMissionData(DEFAULT_EVENT);
    matchCount = Object.keys(tbaMatches).length;
    reportCount = reports.length;
  } catch (e) {
    console.error("Data Fetch failed");
  }

  return (
    <main className="container flex flex-col items-center justify-center" style={{ minHeight: '100vh' }}>

      <div className="w-full max-w-6xl reveal" style={{ marginTop: '4rem', marginBottom: '4rem' }}>

        {/* Cinematic Header */}
        <div className="flex flex-col items-center text-center">
          <div className="py-1 px-4" style={{ borderRadius: '100px', border: '1px solid rgba(139, 92, 246, 0.3)', background: 'rgba(139, 92, 246, 0.1)', color: 'var(--primary)', fontSize: '10px', fontWeight: 950, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '2rem' }}>
            Mission Live • Waco TX
          </div>
          <h1 className="hero-title text-gradient">
            NEW<span className="text-primary">SCOUT</span>
          </h1>
          <p className="mt-2" style={{ fontSize: '1.5rem', color: '#888', maxWidth: '600px', fontWeight: 300 }}>
            Processing <span style={{ color: '#fff', fontWeight: 500 }}>{reportCount}</span> historical logs across
            <span style={{ color: '#fff', fontWeight: 500 }}> {matchCount}</span> matches via Bayesian Simulation.
          </p>
        </div>

        {/* Primary Action Grid */}
        <div className="grid-2 reveal delay-1" style={{ marginTop: '5rem' }}>

          <Link href="/scout" className="card-wrapper">
            <div className="glass flex flex-col justify-end" style={{ height: '300px', padding: '2.5rem', background: 'rgba(10, 10, 13, 0.95)' }}>
              <div className="card-icon" style={{ background: 'rgba(139, 92, 246, 0.2)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                <svg className="text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
              </div>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.02em' }}>SCOUT MATCH</h2>
              <p style={{ color: '#666', fontSize: '0.875rem', marginTop: '0.5rem', fontWeight: 600, letterSpacing: '0.05em' }}>LIVE DATA COLLECTION</p>
            </div>
          </Link>

          <Link href={`/event/${DEFAULT_EVENT}`} className="card-wrapper">
            <div className="glass flex flex-col justify-end" style={{ height: '300px', padding: '2.5rem', background: 'rgba(10, 10, 13, 0.95)' }}>
              <div className="card-icon" style={{ background: 'rgba(6, 182, 212, 0.2)', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
                <svg className="text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              </div>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>WACO PREDICT</h2>
              <p style={{ color: '#666', fontSize: '0.875rem', marginTop: '0.5rem', fontWeight: 600, letterSpacing: '0.05em' }}>
                MONTE CARLO RANKINGS
              </p>
            </div>
          </Link>

          <Link href="/scouters" className="card-wrapper">
            <div className="glass flex flex-col justify-end" style={{ height: '300px', padding: '2.5rem', background: 'rgba(10, 10, 13, 0.95)' }}>
              <div className="card-icon" style={{ background: 'rgba(244, 63, 94, 0.2)', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
                <svg className="text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </div>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>INTEL RANK</h2>
              <p style={{ color: '#666', fontSize: '0.875rem', marginTop: '0.5rem', fontWeight: 600, letterSpacing: '0.05em' }}>SCOUTER PRECISION (SPR)</p>
            </div>
          </Link>
        </div>

        {/* Global Stats Footer */}
        <footer className="flex flex-col items-center reveal delay-2" style={{ marginTop: '6rem', paddingTop: '3rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex gap-8" style={{ marginBottom: '2rem' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '10px', fontWeight: 950, color: '#555', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Signal Strength</p>
              <p style={{ fontSize: '1.25rem', fontWeight: 700, fontStyle: 'italic', color: '#22c55e' }}>{matchCount > 0 ? 'SYNCHRONIZED' : 'LOCAL CACHE'}</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '10px', fontWeight: 950, color: '#555', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Sim Depth</p>
              <p style={{ fontSize: '1.25rem', fontWeight: 700, fontStyle: 'italic', color: 'var(--secondary)' }}>10,000 RUNS</p>
            </div>
          </div>
          <p style={{ fontSize: '11px', fontFamily: 'monospace', color: '#444', fontStyle: 'italic' }}>
            PENN ROBOTICS • ARCHITECTING TRUTH IN REEFSCAPE 2025
          </p>
        </footer>

      </div>
    </main>
  );
}
