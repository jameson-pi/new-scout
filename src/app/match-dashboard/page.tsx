'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import styles from '@/app/match-dashboard/MatchDashboard.module.css';

interface Match {
    matchKey: string;
    compLevel: string;
    matchNumber: number;
    redTeams: string[];
    blueTeams: string[];
    redScore?: number;
    blueScore?: number;
    predictedTime?: string;
    actualTime?: string;
    status: 'scheduled' | 'ongoing' | 'completed';
}

interface MatchDashboardState {
    eventKey: string;
    teamKey: string;
    currentMatchNumber: number;
    testTime?: Date;
}

export default function MatchDashboard() {
    const [state, setState] = useState<MatchDashboardState>({
        eventKey: 'txcmp2',
        teamKey: 'frc6377',
        currentMatchNumber: 0,
    });

    const [mockMatches, setMockMatches] = useState<Match[]>([
        {
            matchKey: 'txcmp2_qm1',
            compLevel: 'qm',
            matchNumber: 1,
            redTeams: ['frc6377', 'frc1690', 'frc2345'],
            blueTeams: ['frc4567', 'frc5678', 'frc6789'],
            redScore: 120,
            blueScore: 135,
            status: 'completed',
        },
        {
            matchKey: 'txcmp2_qm2',
            compLevel: 'qm',
            matchNumber: 2,
            redTeams: ['frc1111', 'frc2222', 'frc3333'],
            blueTeams: ['frc6377', 'frc4444', 'frc5555'],
            redScore: 98,
            blueScore: 145,
            status: 'completed',
        },
        {
            matchKey: 'txcmp2_qm3',
            compLevel: 'qm',
            matchNumber: 3,
            redTeams: ['frc6377', 'frc7777', 'frc8888'],
            blueTeams: ['frc9999', 'frc1010', 'frc1111'],
            status: 'ongoing',
        },
        {
            matchKey: 'txcmp2_qm4',
            compLevel: 'qm',
            matchNumber: 4,
            redTeams: ['frc2020', 'frc3030', 'frc4040'],
            blueTeams: ['frc6377', 'frc5050', 'frc6060'],
            status: 'scheduled',
        },
        {
            matchKey: 'txcmp2_qm5',
            compLevel: 'qm',
            matchNumber: 5,
            redTeams: ['frc6377', 'frc7070', 'frc8080'],
            blueTeams: ['frc9090', 'frc1001', 'frc1102'],
            status: 'scheduled',
        },
    ]);

    const [showTestControls, setShowTestControls] = useState(false);
    const [testTimeInput, setTestTimeInput] = useState('');
    const [countdown, setCountdown] = useState<string>('');

    // Find our team's next match
    const nextMatch = useMemo(() => {
        return mockMatches.find(
            m =>
                (m.redTeams.includes(state.teamKey) || m.blueTeams.includes(state.teamKey)) &&
                (m.status === 'scheduled' || m.status === 'ongoing')
        );
    }, [mockMatches, state.teamKey]);

    // Find current ongoing match (if our team is in it)
    const currentMatch = useMemo(() => {
        return mockMatches.find(
            m =>
                (m.redTeams.includes(state.teamKey) || m.blueTeams.includes(state.teamKey)) &&
                m.status === 'ongoing'
        );
    }, [mockMatches, state.teamKey]);

    // Calculate countdown timer
    useEffect(() => {
        const interval = setInterval(() => {
            const now = state.testTime || new Date();

            if (nextMatch) {
                // Estimate match start time (every match is ~7 minutes)
                const matchesUntil = nextMatch.matchNumber - (state.currentMatchNumber || 0);
                const estimatedMinutes = matchesUntil * 7;
                const estimatedStart = new Date(now.getTime() + estimatedMinutes * 60000);

                const diff = estimatedStart.getTime() - now.getTime();

                if (diff > 0) {
                    const hours = Math.floor(diff / 3600000);
                    const minutes = Math.floor((diff % 3600000) / 60000);
                    const seconds = Math.floor((diff % 60000) / 1000);

                    setCountdown(
                        hours > 0
                            ? `${hours}h ${minutes}m ${seconds}s`
                            : minutes > 0
                              ? `${minutes}m ${seconds}s`
                              : `${seconds}s`
                    );
                } else {
                    setCountdown('Starting soon!');
                }
            } else {
                setCountdown('No upcoming matches');
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [nextMatch, state.testTime, state.currentMatchNumber]);

    const handleSetTestTime = () => {
        if (testTimeInput) {
            const newTime = new Date(testTimeInput);
            setState(prev => ({ ...prev, testTime: newTime }));
            setTestTimeInput('');
        }
    };

    const handleResetTime = () => {
        setState(prev => ({ ...prev, testTime: undefined }));
    };

    const alliance =
        nextMatch && nextMatch.redTeams.includes(state.teamKey)
            ? 'red'
            : 'blue';

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <Link href="/" className={styles.backLink}>
                    ← Back
                </Link>
                <h1 className={styles.title}>Match Dashboard</h1>
                <button
                    className={styles.testToggle}
                    onClick={() => setShowTestControls(!showTestControls)}
                >
                    🧪 Test Controls {showTestControls ? '×' : '+'}
                </button>
            </div>

            {/* Test Controls */}
            {showTestControls && (
                <div className={styles.testControls}>
                    <h3>⏰ Test Time Controls</h3>
                    <div className={styles.testInputGroup}>
                        <input
                            type="datetime-local"
                            value={testTimeInput}
                            onChange={e => setTestTimeInput(e.target.value)}
                            className={styles.testInput}
                        />
                        <button onClick={handleSetTestTime} className={styles.testButton}>
                            Set Time
                        </button>
                        <button
                            onClick={handleResetTime}
                            className={`${styles.testButton} ${styles.testButtonSecondary}`}
                        >
                            Use Current
                        </button>
                    </div>
                    {state.testTime && (
                        <p className={styles.testInfo}>
                            Test time: {state.testTime.toLocaleString()}
                        </p>
                    )}
                </div>
            )}

            {/* Main Content */}
            <div className={styles.content}>
                {/* Current Match Section */}
                {currentMatch && (
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>🎮 NOW PLAYING</h2>
                        <div className={`${styles.matchCard} ${styles.currentMatch}`}>
                            <div className={styles.matchHeader}>
                                <div>
                                    <span className={styles.matchLabel}>MATCH</span>
                                    <h3 className={styles.matchNumber}>
                                        QM{currentMatch.matchNumber}
                                    </h3>
                                </div>
                                <div className={styles.matchStatus}>LIVE</div>
                            </div>

                            <div className={styles.allianceGrid}>
                                <div className={`${styles.alliance} ${styles.red}`}>
                                    <h4>RED ALLIANCE</h4>
                                    <div className={styles.teamList}>
                                        {currentMatch.redTeams.map(team => (
                                            <div
                                                key={team}
                                                className={`${styles.teamBadge} ${
                                                    team === state.teamKey ? styles.ourTeam : ''
                                                }`}
                                            >
                                                {team.replace('frc', '')}
                                            </div>
                                        ))}
                                    </div>
                                    {currentMatch.redScore !== undefined && (
                                        <div className={styles.score}>{currentMatch.redScore}</div>
                                    )}
                                </div>

                                <div className={styles.vs}>VS</div>

                                <div className={`${styles.alliance} ${styles.blue}`}>
                                    <h4>BLUE ALLIANCE</h4>
                                    <div className={styles.teamList}>
                                        {currentMatch.blueTeams.map(team => (
                                            <div
                                                key={team}
                                                className={`${styles.teamBadge} ${
                                                    team === state.teamKey ? styles.ourTeam : ''
                                                }`}
                                            >
                                                {team.replace('frc', '')}
                                            </div>
                                        ))}
                                    </div>
                                    {currentMatch.blueScore !== undefined && (
                                        <div className={styles.score}>{currentMatch.blueScore}</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* Next Match Section */}
                {nextMatch && !currentMatch && (
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>⏱️ UP NEXT</h2>
                        <div className={`${styles.matchCard} ${styles.nextMatch}`}>
                            <div className={styles.countdownDisplay}>
                                <div className={styles.countdownLabel}>MATCH STARTS IN</div>
                                <div className={styles.countdownTimer}>{countdown}</div>
                                <div className={styles.matchInfo}>
                                    Match QM{nextMatch.matchNumber} • {alliance.toUpperCase()} Alliance
                                </div>
                            </div>

                            <div className={styles.allianceGrid}>
                                <div className={`${styles.alliance} ${styles.red}`}>
                                    <h4>RED ALLIANCE</h4>
                                    <div className={styles.teamList}>
                                        {nextMatch.redTeams.map(team => (
                                            <div
                                                key={team}
                                                className={`${styles.teamBadge} ${
                                                    team === state.teamKey ? styles.ourTeam : ''
                                                }`}
                                            >
                                                {team.replace('frc', '')}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className={styles.vs}>VS</div>

                                <div className={`${styles.alliance} ${styles.blue}`}>
                                    <h4>BLUE ALLIANCE</h4>
                                    <div className={styles.teamList}>
                                        {nextMatch.blueTeams.map(team => (
                                            <div
                                                key={team}
                                                className={`${styles.teamBadge} ${
                                                    team === state.teamKey ? styles.ourTeam : ''
                                                }`}
                                            >
                                                {team.replace('frc', '')}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className={styles.prepChecklist}>
                                <h4>PREP CHECKLIST</h4>
                                <ul>
                                    <li>✓ Battery charged</li>
                                    <li>✓ Auto routine selected</li>
                                    <li>✓ Driver practice complete</li>
                                </ul>
                            </div>
                        </div>
                    </section>
                )}

                {/* Match History Section */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>📋 Match Schedule</h2>
                    <div className={styles.matchList}>
                        {mockMatches.map(match => {
                            const isOurMatch =
                                match.redTeams.includes(state.teamKey) ||
                                match.blueTeams.includes(state.teamKey);
                            const isOurAlliance = match.redTeams.includes(state.teamKey) ? 'red' : 'blue';

                            return (
                                <div
                                    key={match.matchKey}
                                    className={`${styles.matchRow} ${isOurMatch ? styles.highlightRow : ''} ${
                                        match.status === 'completed' ? styles.completed : ''
                                    } ${match.status === 'ongoing' ? styles.ongoing : ''}`}
                                >
                                    <div className={styles.matchRowHeader}>
                                        <span className={styles.matchRowNumber}>QM{match.matchNumber}</span>
                                        <span
                                            className={`${styles.matchRowStatus} ${styles[match.status]}`}
                                        >
                                            {match.status === 'completed'
                                                ? '✓ Done'
                                                : match.status === 'ongoing'
                                                  ? '🔴 Live'
                                                  : 'Scheduled'}
                                        </span>
                                    </div>

                                    <div className={styles.matchRowTeams}>
                                        <div className={`${styles.allianceRow} ${styles.red}`}>
                                            {match.redTeams.map(team => (
                                                <span
                                                    key={team}
                                                    className={`${styles.smallBadge} ${
                                                        team === state.teamKey ? styles.highlight : ''
                                                    }`}
                                                >
                                                    {team.replace('frc', '')}
                                                </span>
                                            ))}
                                            {match.redScore !== undefined && (
                                                <span className={styles.scoreSmall}>{match.redScore}</span>
                                            )}
                                        </div>

                                        <div className={styles.vs2}>VS</div>

                                        <div className={`${styles.allianceRow} ${styles.blue}`}>
                                            {match.blueTeams.map(team => (
                                                <span
                                                    key={team}
                                                    className={`${styles.smallBadge} ${
                                                        team === state.teamKey ? styles.highlight : ''
                                                    }`}
                                                >
                                                    {team.replace('frc', '')}
                                                </span>
                                            ))}
                                            {match.blueScore !== undefined && (
                                                <span className={styles.scoreSmall}>{match.blueScore}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            </div>
        </div>
    );
}


