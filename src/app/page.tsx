import Link from 'next/link';
import { getAvailableEvents } from '@/lib/data';

export default async function Home() {
  const events = getAvailableEvents();

  return (
    <main className="container flex flex-col items-center justify-center" style={{ minHeight: '100vh', paddingTop: '8rem' }}>

      <div className="w-full max-w-6xl reveal">

        {/* Cinematic Header */}
        <div className="flex flex-col items-center text-center">
          <div className="py-1 px-4" style={{ borderRadius: '100px', border: '1px solid rgba(6, 182, 212, 0.3)', background: 'rgba(6, 182, 212, 0.1)', color: 'var(--secondary)', fontSize: '10px', fontWeight: 950, letterSpacing: '0.4em', textTransform: 'uppercase', marginBottom: '2.5rem' }}>
            Theater Selection Active
          </div>
          <h1 className="hero-title text-gradient" style={{ fontSize: 'clamp(3rem, 12vw, 8rem)', fontWeight: 950, letterSpacing: '-0.05em' }}>
            MISSION<span className="text-primary">CONTROL</span>
          </h1>
          <p className="mt-4" style={{ fontSize: '1.25rem', color: '#555', maxWidth: '600px', fontWeight: 500 }}>
            Select a tactical theater to begin signal processing. Dynamic simulation active for <span style={{ color: '#fff' }}>{events.length}</span> active events.
          </p>
        </div>

        {/* Active Missions Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', marginTop: '6rem' }} className="reveal delay-1">
          {events.map((event, i) => (
            <Link key={event.key} href={`/event/${event.key}`} className="card-wrapper" style={{ textDecoration: 'none' }}>
              <div className="glass flex flex-col justify-between" style={{ height: '280px', padding: '2.5rem', background: 'rgba(10, 10, 13, 0.95)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '40px' }}>
                <div>
                  <div className="flex justify-between items-start">
                    <div className="card-icon" style={{ background: i === 0 ? 'rgba(139, 92, 246, 0.1)' : 'rgba(255,255,255,0.03)', border: i === 0 ? '1px solid rgba(139, 92, 246, 0.2)' : '1px solid rgba(255,255,255,0.05)', marginBottom: '1.5rem' }}>
                      <svg style={{ width: '1.5rem', height: '1.5rem' }} className={i === 0 ? "text-primary" : "text-white"} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    {i === 0 && <span style={{ fontSize: '8px', fontWeight: 950, color: 'var(--primary)', border: '1px solid var(--primary)', padding: '2px 8px', borderRadius: '100px' }}>PRIORITY HIGH</span>}
                  </div>
                  <h2 style={{ fontSize: '2rem', fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.02em', color: '#fff', textTransform: 'uppercase' }}>{event.name}</h2>
                  <p style={{ color: '#444', fontSize: '10px', marginTop: '0.25rem', fontWeight: 950, letterSpacing: '0.15em' }}>{event.location.toUpperCase()}</p>
                </div>
                <div className="flex justify-between items-end">
                  <span style={{ fontSize: '9px', fontWeight: 950, color: '#333', letterSpacing: '0.1em' }}>CODE: {event.key.toUpperCase()}</span>
                  <span style={{ fontSize: '11px', fontWeight: 950, color: 'var(--secondary)' }}>ENTER THEATER →</span>
                </div>
              </div>
            </Link>
          ))}

          {/* Global Scouter Intel Card */}
          <Link href={`/scouters/${events[0]?.key || '2025txwac'}`} className="card-wrapper" style={{ textDecoration: 'none' }}>
            <div className="glass flex flex-col justify-between" style={{ height: '280px', padding: '2.5rem', background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.05) 0%, rgba(10, 10, 13, 0.95) 100%)', border: '1px solid rgba(244, 63, 94, 0.1)', borderRadius: '40px' }}>
              <div>
                <div className="card-icon" style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)', marginBottom: '1.5rem' }}>
                  <svg className="text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
                <h2 style={{ fontSize: '2rem', fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.02em', color: '#fff', textTransform: 'uppercase' }}>OPERATIVE INTEL</h2>
                <p style={{ color: '#444', fontSize: '10px', marginTop: '0.25rem', fontWeight: 950, letterSpacing: '0.15em' }}>GLOBAL PRECISION RANKINGS</p>
              </div>
              <div className="flex justify-between items-end">
                <span style={{ fontSize: '9px', fontWeight: 950, color: '#333', letterSpacing: '0.1em' }}>CROSS-MISSION ANALYTICS</span>
                <span style={{ fontSize: '11px', fontWeight: 950, color: 'var(--accent)' }}>VIEW DOSSIERS →</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Global Stats Footer */}
        <footer className="flex flex-col items-center reveal delay-2" style={{ marginTop: '8rem', paddingBottom: '4rem' }}>
          <div className="flex gap-12" style={{ marginBottom: '3rem' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '10px', fontWeight: 950, color: '#444', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Unified Feed</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, fontStyle: 'italic', color: '#22c55e' }}>SYNCHRONIZED</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '10px', fontWeight: 950, color: '#444', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Available Missions</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, fontStyle: 'italic', color: 'var(--secondary)' }}>{events.length} ACTIVE</p>
            </div>
          </div>
          <div style={{ height: '1px', width: '200px', background: 'rgba(255,255,255,0.05)', marginBottom: '2rem' }}></div>
          <p style={{ fontSize: '11px', fontFamily: 'monospace', color: '#333', fontStyle: 'italic', letterSpacing: '0.1em' }}>
            PENN ROBOTICS • ARCHITECTING TRUTH IN REEFSCAPE 2025
          </p>
        </footer>

      </div>
    </main>
  );
}
