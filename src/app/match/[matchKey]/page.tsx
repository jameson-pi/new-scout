import Link from 'next/link';
import { getMissionData } from '@/lib/data';
import { getAllPitReports } from '@/lib/data';
import { getEventMatches } from '@/lib/tba';
import { getMatchNumber, getMatchLabel } from '@/lib/simulation';
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
    const isPlayed = match.alliances?.red?.score != null && match.alliances.red.score >= 0;
    const matchNumber = getMatchNumber(matchKey);

    const TELE_TOWER: Record<string, number> = { Level1: 10, Level2: 20, Level3: 30, None: 0, 'No Attempt': 0 };

    // Reports for THIS specific match only
    const matchReports = reports.filter(r => r.matchKey === matchKey);

    // Per-robot predicted score = EPA from all reports BEFORE this match
    function getRobotPrediction(teamKey: string): { predictedPts: number; predictedAuto: number; predictedTele: number; predictedTower: number; sampleSize: number } {
        const priorReports = reports.filter(r =>
            r.teamKey === teamKey &&
            getMatchNumber(r.matchKey) < matchNumber
        );
        if (priorReports.length === 0) {
            // Fall back to all reports if no prior ones (e.g. first match)
            const allTeamReports = reports.filter(r => r.teamKey === teamKey);
            if (allTeamReports.length === 0) return { predictedPts: 0, predictedAuto: 0, predictedTele: 0, predictedTower: 0, sampleSize: 0 };
            const n = allTeamReports.length;
            const autoFuel = allTeamReports.reduce((s, r) => s + r.data.auto.fuel_scored, 0) / n;
            const teleFuel = allTeamReports.reduce((s, r) => s + r.data.teleop.fuel_scored, 0) / n;
            const tower = allTeamReports.reduce((s, r) => s + (TELE_TOWER[r.data.teleop.climb_level] || 0), 0) / n;
            return { predictedPts: Math.round(autoFuel + teleFuel + tower), predictedAuto: Math.round(autoFuel), predictedTele: Math.round(teleFuel), predictedTower: Math.round(tower), sampleSize: n };
        }
        const n = priorReports.length;
        const autoFuel = priorReports.reduce((s, r) => s + r.data.auto.fuel_scored, 0) / n;
        const teleFuel = priorReports.reduce((s, r) => s + r.data.teleop.fuel_scored, 0) / n;
        const tower = priorReports.reduce((s, r) => s + (TELE_TOWER[r.data.teleop.climb_level] || 0), 0) / n;
        return { predictedPts: Math.round(autoFuel + teleFuel + tower), predictedAuto: Math.round(autoFuel), predictedTele: Math.round(teleFuel), predictedTower: Math.round(tower), sampleSize: n };
    }

    // Build alliance predicted totals
    const redPredicted = alliances.red.team_keys.reduce((s: number, tk: string) => s + getRobotPrediction(tk).predictedPts, 0);
    const bluePredicted = alliances.blue.team_keys.reduce((s: number, tk: string) => s + getRobotPrediction(tk).predictedPts, 0);

    const getProfiles = (teams: string[]) => teams.map(teamKey => {
        const teamReports = reports.filter(r => r.teamKey === teamKey);
        const count = teamReports.length || 1;
        const pit = pitReports.find(p => p.teamKey === teamKey) || null;
        const thisMatchReport = matchReports.find(r => r.teamKey === teamKey) || null;
        const predicted = getRobotPrediction(teamKey);
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
            predicted,
            // Actual this-match data (null if not scouted)
            actual: thisMatchReport ? {
                autoFuel: thisMatchReport.data.auto.fuel_scored,
                teleFuel: thisMatchReport.data.teleop.fuel_scored,
                autoClimb: thisMatchReport.data.auto.climb_level,
                teleClimb: thisMatchReport.data.teleop.climb_level,
                towerPts: TELE_TOWER[thisMatchReport.data.teleop.climb_level] || 0,
                autoMoved: thisMatchReport.data.auto.moved,
                mechFailure: thisMatchReport.data.mech_failure || false,
                defenderRating: thisMatchReport.data.defender_rating || 0,
                notes: thisMatchReport.data.notes || '',
                scoutedBy: thisMatchReport.scoutId,
            } : null,
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

    // TBA official score breakdown for played matches
    const tbaResult = isPlayed ? {
        redScore: match.alliances.red.score as number,
        blueScore: match.alliances.blue.score as number,
        winner: (match.alliances.red.score > match.alliances.blue.score ? 'red'
            : match.alliances.blue.score > match.alliances.red.score ? 'blue' : 'tie') as 'red' | 'blue' | 'tie',
        red: {
            autoPoints: match.score_breakdown?.red?.autoPoints ?? null,
            teleopPoints: match.score_breakdown?.red?.teleopPoints ?? null,
            endgamePoints: match.score_breakdown?.red?.endgamePoints ?? null,
            fuelPoints: match.score_breakdown?.red?.fuelPoints ?? null,
            autoFuelPoints: match.score_breakdown?.red?.autoFuelPoints ?? null,
            teleopFuelPoints: match.score_breakdown?.red?.teleopFuelPoints ?? null,
            towerEndgamePoints: match.score_breakdown?.red?.towerEndgamePoints ?? null,
            rp: match.score_breakdown?.red?.rp ?? null,
        },
        blue: {
            autoPoints: match.score_breakdown?.blue?.autoPoints ?? null,
            teleopPoints: match.score_breakdown?.blue?.teleopPoints ?? null,
            endgamePoints: match.score_breakdown?.blue?.endgamePoints ?? null,
            fuelPoints: match.score_breakdown?.blue?.fuelPoints ?? null,
            autoFuelPoints: match.score_breakdown?.blue?.autoFuelPoints ?? null,
            teleopFuelPoints: match.score_breakdown?.blue?.teleopFuelPoints ?? null,
            towerEndgamePoints: match.score_breakdown?.blue?.towerEndgamePoints ?? null,
            rp: match.score_breakdown?.blue?.rp ?? null,
        },
    } : null;

    return (
        <main style={{ minHeight: '100vh', background: 'var(--background)', color: 'var(--foreground)', padding: 'clamp(1.5rem, 5vw, 2.5rem)' }}>
            <div className="mx-auto responsive-padding" style={{ maxWidth: '1200px', display: 'grid', gap: '2rem' }}>

                <header className="reveal">
                    <Link href={`/event/${eventKey}`} style={{ fontSize: '9px', fontWeight: 950, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--primary-teal)', textDecoration: 'none', marginBottom: '1.5rem', display: 'block', opacity: 0.9 }}>
                        ← BACK TO {eventKey.split('2026')[1]?.toUpperCase() || 'MISSION'} ANALYTICS
                    </Link>
                    <div className="flex justify-between items-end" style={{ gap: '3rem', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1 }}>
                            <h1 style={{ fontSize: 'clamp(4rem, 12vw, 7rem)', fontWeight: 950, fontStyle: 'italic', letterSpacing: '-0.03em', textTransform: 'uppercase', lineHeight: 1, marginBottom: '0.5rem', background: 'linear-gradient(135deg, var(--primary-teal) 0%, var(--primary-brown) 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent' }}>
                                {isPlayed ? 'MATCH' : 'BATTLE'} <span style={{ color: isPlayed ? 'var(--secondary-red)' : 'var(--primary-brown)', WebkitTextFillColor: 'initial' }}>BREAKDOWN</span>
                            </h1>
                            <div style={{ height: '4px', width: '120px', background: 'linear-gradient(90deg, var(--primary-teal) 0%, var(--primary-brown) 100%)', borderRadius: '2px', marginBottom: '1rem' }} />
                        </div>
                        <div style={{ textAlign: 'right', minWidth: 'fit-content' }}>
                            <p style={{ fontSize: '10px', fontWeight: 950, color: 'var(--primary-teal)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.25rem' }}>⚙ MATCH ID</p>
                            <p style={{ fontSize: '4rem', fontWeight: 950, fontStyle: 'italic', color: 'var(--secondary-red)', lineHeight: 1, textShadow: '0 0 20px rgba(172, 36, 36, 0.3)' }}>
                                {getMatchLabel(matchKey)}
                            </p>
                        </div>
                    </div>
                </header>

                <MatchTacticalInterface
                    matchKey={matchKey}
                    eventKey={eventKey}
                    redProfiles={redProfiles}
                    blueProfiles={blueProfiles}
                    isPlayed={isPlayed}
                    tbaResult={tbaResult}
                    redPredicted={redPredicted}
                    bluePredicted={bluePredicted}
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
