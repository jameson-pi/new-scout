import Link from 'next/link';
import { getMissionData } from '@/lib/data';
import { getAllPitReports } from '@/lib/data';
import { getEventMatches } from '@/lib/tba';
import MatchTacticalInterface from './MatchTacticalInterface';

export default async function MatchStrategyPage({ params }: { params: Promise<{ matchKey: string }> }) {
    const { matchKey } = await params;
    const eventKey = matchKey.split('_')[0];
    const { reports } = await getMissionData(eventKey);
    const [matches, pitReports] = await Promise.all([
        getEventMatches(eventKey),
        getAllPitReports(eventKey),
    ]);
    const match = matches.find((m: any) => m.key === matchKey);

    if (!match) return <div>Match Not Found</div>;

    const alliances = match.alliances;

    const TELE_TOWER: Record<string, number> = { Level1: 10, Level2: 20, Level3: 30, None: 0 };

    const getProfiles = (teams: string[]) => teams.map(teamKey => {
        const teamReports = reports.filter(r => r.teamKey === teamKey);
        const count = teamReports.length || 1;
        const pit = pitReports.find(p => p.teamKey === teamKey) || null;

        // Hub control assessment
        const hubDominant = teamReports.filter(r => r.data.hub_control === 'Dominant').length;
        const hubControl = hubDominant > count / 2 ? 'Dominant' : 'Average';

        return {
            teamKey,
            teamNum: teamKey.replace('frc', ''),
            avgAutoFuel: (teamReports.reduce((acc, r) => acc + (r.data.auto.fuel_scored || 0), 0) / count).toFixed(1),
            avgTeleopFuel: (teamReports.reduce((acc, r) => acc + (r.data.teleop.fuel_scored || 0), 0) / count).toFixed(1),
            avgFuel: (teamReports.reduce((acc, r) => acc + (r.data.auto.fuel_scored || 0) + (r.data.teleop.fuel_scored || 0), 0) / count).toFixed(1),
            avgTowerPts: (teamReports.reduce((acc, r) => acc + (TELE_TOWER[r.data.teleop.climb_level] || 0), 0) / count).toFixed(1),
            bestTowerLevel: teamReports.some(r => r.data.teleop.climb_level === 'Level3') ? 'Level3' : teamReports.some(r => r.data.teleop.climb_level === 'Level2') ? 'Level2' : teamReports.some(r => r.data.teleop.climb_level === 'Level1') ? 'Level1' : 'None',
            autoMobility: ((teamReports.filter(r => r.data.auto.moved).length / count) * 100).toFixed(0),
            autoFuel: (teamReports.reduce((acc, r) => acc + (r.data.auto.fuel_scored || 0), 0) / count).toFixed(1),
            towerRate: ((teamReports.filter(r => r.data.teleop.climb_level !== 'No Attempt').length / count) * 100).toFixed(0),
            avgDefense: (teamReports.reduce((acc, r) => acc + (r.data.defender_rating || 0), 0) / count).toFixed(1),
            hubControl,
            trenchCapable: teamReports.some(r => r.data.trench_capable) ? 'Yes' : (pit?.trench === 'Yes' ? 'Yes' : 'No'),
            failures: teamReports.filter(r => r.data.mech_failure).length,
            notes: teamReports.map(r => r.data.notes).filter(Boolean).slice(0, 5).join(' | '),
            pit: pit ? {
                drivebase: pit.drivebase,
                climb: pit.climb,
                hopperCapacity: pit.hopperCapacity,
                trench: pit.trench,
                bump: pit.bump,
                canLob: pit.canLob,
                turret: pit.turret,
                shiftTracking: pit.shiftTracking,
                pickupFloor: pit.pickupFloor,
                pickupOutpost: pit.pickupOutpost,
                autoClimb: pit.autoClimb,
                robotQuality: pit.robotQuality,
                weightLbs: pit.weightLbs,
                heightIn: pit.heightIn,
                otherNotes: pit.otherNotes,
            } : null,
        };
    });

    const redProfiles = getProfiles(alliances.red.team_keys);
    const blueProfiles = getProfiles(alliances.blue.team_keys);

    return (
        <main style={{ minHeight: '100vh', background: '#000', color: '#fff', padding: '4rem 2rem' }}>
            <div className="mx-auto" style={{ maxWidth: '1200px', display: 'grid', gap: '3rem' }}>

                <header className="reveal">
                    <Link href={`/event/${eventKey}`} style={{ fontSize: '9px', fontWeight: 950, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#888', textDecoration: 'none', marginBottom: '1rem', display: 'block' }}>
                        ← BACK TO {eventKey.split('2026')[1]?.toUpperCase() || 'MISSION'} ANALYTICS
                    </Link>
                    <div className="flex justify-between items-end">
                        <h1 className="text-gradient" style={{ fontSize: 'clamp(3rem, 8vw, 5rem)', fontWeight: 950, fontStyle: 'italic', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
                            STRATEGY<span className="text-primary">TERMINAL</span>
                        </h1>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: '10px', fontWeight: 950, color: '#888', textTransform: 'uppercase' }}>Match Identifier</p>
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
                        SECURE TACTICAL UPLINK // REBUILT 2026 // ENCRYPTED
                    </p>
                </footer>
            </div>
        </main>
    );
}
