import Link from 'next/link';
import { getAvailableEvents } from '@/lib/data';
import { Suspense } from 'react';

// Lazy load heavy components
const EventGrid = ({ events, defaultEventKey }: { events: any[]; defaultEventKey: string }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginTop: '4.5rem', justifyContent: 'center' }} className="reveal delay-1 home-grid">
    {events.map((event, i) => (
      <Link key={event.key} href={`/event/${event.key}`} className="card-wrapper" style={{ textDecoration: 'none' }}>
        <div className="glass flex flex-col justify-between home-card" style={{ height: '280px', padding: '2.5rem', background: `linear-gradient(135deg, ${i === 0 ? 'rgba(138,88,35,0.12)' : 'rgba(0,204,204,0.08)'} 0%, transparent 100%)`, border: `2px solid ${i === 0 ? 'var(--primary-brown)' : 'var(--primary-teal)'}`, borderRadius: '28px', boxShadow: `0 8px 24px ${i === 0 ? 'rgba(138,88,35,0.15)' : 'rgba(0,204,204,0.15)'}` }}>
          <div>
            <div className="flex justify-between items-start">
              <div className="card-icon" style={{ background: i === 0 ? 'rgba(138, 88, 35, 0.2)' : 'rgba(0,204,204,0.2)', border: i === 0 ? '2px solid var(--primary-brown)' : '2px solid var(--primary-teal)', marginBottom: '1.5rem', borderRadius: '12px', padding: '0.75rem' }}>
                <svg style={{ width: '1.5rem', height: '1.5rem', color: i === 0 ? 'var(--primary-brown)' : 'var(--primary-teal)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              {i === 0 && <span style={{ fontSize: '10px', fontWeight: 950, color: 'var(--primary-brown)', border: '2px solid var(--primary-brown)', padding: '0.35rem 0.75rem', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>⭐ Primary</span>}
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: 950, letterSpacing: '-0.02em', color: i === 0 ? 'var(--primary-brown)' : 'var(--primary-teal)', textShadow: `0 0 15px ${i === 0 ? 'rgba(138,88,35,0.3)' : 'rgba(0,204,204,0.3)'}` }}>{event.name}</h2>
            <p style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '0.5rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{event.location.toUpperCase()}</p>
          </div>
          <div className="flex justify-between items-end">
            <span style={{ fontSize: '11px', fontWeight: 900, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{event.key.toUpperCase()}</span>
            <span style={{ fontSize: '12px', fontWeight: 950, color: i === 0 ? 'var(--primary-brown)' : 'var(--primary-teal)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>→ Enter</span>
          </div>
        </div>
      </Link>
    ))}

    {/* Match Dashboard Card */}
    <Link href="/match-dashboard" className="card-wrapper" style={{ textDecoration: 'none' }}>
      <div className="glass flex flex-col justify-between" style={{ height: '280px', padding: '2.5rem', background: 'linear-gradient(135deg, rgba(100, 116, 139, 0.12) 0%, transparent 100%)', border: '2px solid var(--primary-teal)', borderRadius: '28px', boxShadow: '0 8px 24px rgba(0,204,204,0.15)' }}>
        <div>
          <div className="card-icon" style={{ background: 'rgba(0, 204, 204, 0.2)', border: '2px solid var(--primary-teal)', marginBottom: '1.5rem', borderRadius: '12px', padding: '0.75rem' }}>
            <svg style={{ width: '1.5rem', height: '1.5rem', color: 'var(--primary-teal)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: 950, letterSpacing: '-0.02em', color: 'var(--primary-teal)', textShadow: '0 0 15px rgba(0,204,204,0.3)' }}>Match Countdown</h2>
          <p style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '0.5rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Live Schedule & Scores</p>
        </div>
        <div className="flex justify-between items-end">
          <span style={{ fontSize: '11px', fontWeight: 900, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Current Event</span>
          <span style={{ fontSize: '12px', fontWeight: 950, color: 'var(--primary-teal)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>→ View</span>
        </div>
      </div>
    </Link>

    {/* Scouter Intel Card */}
    <Link href={`/scouters/${defaultEventKey}`} className="card-wrapper" style={{ textDecoration: 'none' }}>
      <div className="glass flex flex-col justify-between" style={{ height: '280px', padding: '2.5rem', background: 'linear-gradient(135deg, rgba(172,36,36,0.12) 0%, transparent 100%)', border: '2px solid var(--secondary-red)', borderRadius: '28px', boxShadow: '0 8px 24px rgba(172,36,36,0.15)' }}>
        <div>
          <div className="card-icon" style={{ background: 'rgba(172, 36, 36, 0.2)', border: '2px solid var(--secondary-red)', marginBottom: '1.5rem', borderRadius: '12px', padding: '0.75rem' }}>
            <svg className="text-red" style={{ width: '1.5rem', height: '1.5rem', color: 'var(--secondary-red)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: 950, letterSpacing: '-0.02em', color: 'var(--secondary-red)', textShadow: '0 0 15px rgba(172,36,36,0.3)' }}>Scouter Rankings</h2>
          <p style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '0.5rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Precision Scores & Analysis</p>
        </div>
        <div className="flex justify-between items-end">
          <span style={{ fontSize: '11px', fontWeight: 900, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>All Events</span>
          <span style={{ fontSize: '12px', fontWeight: 950, color: 'var(--secondary-red)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>→ View</span>
        </div>
      </div>
    </Link>
  </div>
);

export default async function Home() {
  const eventsRaw = await getAvailableEvents();
  const events = Array.isArray(eventsRaw) ? eventsRaw : [];
  const defaultEventKey = events[0]?.key || '2026txcle';

  return (
    <main className="container flex flex-col items-center justify-center" style={{ minHeight: '100vh', paddingTop: 'clamp(6rem, 12vw, 8rem)', paddingLeft: 'clamp(1rem, 4vw, 1.25rem)', paddingRight: 'clamp(1rem, 4vw, 1.25rem)', paddingBottom: '2rem', margin: '0 auto' }}>

      <div className="w-full max-w-6xl reveal" style={{ width: '100%', maxWidth: '1200px', overflow: 'hidden' }}>

        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <div className="py-1 px-4" style={{ borderRadius: '999px', border: '2px solid var(--primary-teal)', background: 'rgba(0, 204, 204, 0.12)', color: 'var(--primary-teal)', fontSize: '11px', fontWeight: 950, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '2rem', boxShadow: '0 0 20px rgba(0, 204, 204, 0.2)' }}>
            ⚙ Event Dashboard
          </div>
          <h1 style={{ fontSize: 'clamp(3.5rem, 12vw, 7.5rem)', fontWeight: 950, letterSpacing: '-0.03em', background: 'linear-gradient(135deg, var(--primary-teal) 0%, var(--primary-brown) 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent', lineHeight: 1.1 }}>
            Scout<span style={{ color: 'var(--secondary-red)', WebkitTextFillColor: 'initial' }}>Control</span>
          </h1>
          <div style={{ height: '5px', width: '140px', background: 'linear-gradient(90deg, var(--primary-teal) 0%, var(--primary-brown) 100%)', borderRadius: '3px', margin: '1.5rem 0' }} />
          <p style={{ fontSize: '1.25rem', color: 'var(--muted)', maxWidth: '700px', fontWeight: 600, lineHeight: 1.6 }}>
            Select an event to view dashboards, match strategy, and scouting workflows. Currently tracking <span style={{ color: 'var(--primary-teal)', fontWeight: 950 }}>{events.length}</span> events.
          </p>
        </div>

        {/* Active Events Grid */}
        <Suspense fallback={<div style={{ textAlign: 'center', marginTop: '3rem', color: '#666' }}>Loading events...</div>}>
          <EventGrid events={events} defaultEventKey={defaultEventKey} />
        </Suspense>

        {/* Footer */}
        <footer className="flex flex-col items-center reveal delay-2" style={{ marginTop: '6rem', paddingBottom: '3rem' }}>
          <div className="flex gap-12" style={{ marginBottom: '2.25rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '10px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.16em' }}>System</p>
              <p style={{ fontSize: '1.2rem', fontWeight: 650, color: 'var(--primary-brown)' }}>Ready</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '10px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.16em' }}>Active Events</p>
              <p style={{ fontSize: '1.2rem', fontWeight: 650, color: 'var(--secondary-blue)' }}>{events.length}</p>
            </div>
          </div>
          <div style={{ height: '1px', width: '220px', background: 'rgba(255,255,255,0.08)', marginBottom: '1.5rem' }}></div>
          <p style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--muted)', letterSpacing: '0.06em' }}>
            Penn Robotics • REBUILT 2026 Scouting
          </p>
        </footer>

      </div>
    </main>
  );
}
