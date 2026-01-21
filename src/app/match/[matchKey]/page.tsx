import Link from 'next/link';
import { getMissionData } from '@/lib/data';
import { getEventMatches } from '@/lib/tba';
import MatchTacticalInterface from './MatchTacticalInterface';

export default async function MatchStrategyPage({ params }: { params: Promise<{ matchKey: string }> }) {
    const { matchKey } = await params;
    const eventKey = matchKey.split('_')[0];
    const { reports } = await getMissionData(eventKey);
    const matches = await getEventMatches(eventKey);
    const match = matches.find((m: any) => m.key === matchKey);

    if (!match) return <div>Match Not Found</div>;

    const alliances = match.alliances;

    const getProfiles = (teams: string[]) => teams.map(teamKey => {
        const teamReports = reports.filter(r => r.teamKey === teamKey);
        return {
            teamKey,
            teamNum: teamKey.replace('frc', ''),
            avgL4: (teamReports.reduce((acc, r) => acc + (r.data.teleop.coral_l4 || 0), 0) / (teamReports.length || 1)).toFixed(1),
            autoMobility: ((teamReports.filter(r => r.data.auto.moved).length / (teamReports.length || 1)) * 100).toFixed(0),
            maxAlgae: Math.max(...teamReports.map(r => (r.data.teleop.algae_processor || 0) + (r.data.teleop.algae_net || 0)), 0),
            climbRate: ((teamReports.filter(r => r.data.teleop.climb === 'Deep').length / (teamReports.length || 1)) * 100).toFixed(0),
            avgDefense: (teamReports.reduce((acc, r) => acc + (r.data.defender_rating || 0), 0) / (teamReports.length || 1)).toFixed(1),
            failures: teamReports.filter(r => r.data.mech_failure).length,
            notes: teamReports.map(r => r.data.notes).filter(Boolean).join(' | ')
        };
    });

    const redProfiles = getProfiles(alliances.red.team_keys);
    const blueProfiles = getProfiles(alliances.blue.team_keys);

    return (
        <main style={{ minHeight: '100vh', background: '#000', color: '#fff', padding: '4rem 2rem' }}>
            <div className="mx-auto" style={{ maxWidth: '1200px', display: 'grid', gap: '3rem' }}>

                <header className="reveal">
                    <Link href={`/event/${eventKey}`} style={{ fontSize: '9px', fontWeight: 950, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#444', textDecoration: 'none', marginBottom: '1rem', display: 'block' }}>
                        ← BACK TO {eventKey.split('2025')[1]?.toUpperCase() || 'MISSION'} ANALYTICS
                    </Link>
                    <div className="flex justify-between items-end">
                        <h1 className="text-gradient" style={{ fontSize: 'clamp(3rem, 8vw, 5rem)', fontWeight: 950, fontStyle: 'italic', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
                            STRATEGY<span className="text-primary">TERMINAL</span>
                        </h1>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: '10px', fontWeight: 950, color: '#444', textTransform: 'uppercase' }}>Match Identifier</p>
                            <p style={{ fontSize: '1.5rem', fontWeight: 950, fontStyle: 'italic', color: 'var(--secondary)' }}>{matchKey.split('_qm').pop()?.toUpperCase()}</p>
                        </div>
                    </div>
                </header>

                <MatchTacticalInterface
                    matchKey={matchKey}
                    eventKey={eventKey}
                    redProfiles={redProfiles}
                    blueProfiles={blueProfiles}
                />

                <footer style={{ marginTop: '4rem', padding: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                    <p style={{ fontSize: '10px', fontFamily: 'monospace', color: '#222', letterSpacing: '0.2em' }}>
                        SECURE TACTICAL UPLINK // REEFSCAPE 2025 // ENCRYPTED
                    </p>
                </footer>
            </div>
        </main>
    );
}
