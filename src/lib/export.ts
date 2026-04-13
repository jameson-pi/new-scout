/**
 * Export utilities for CSV/PDF generation
 */

import type { TeamExportRow } from './actions';
import { ScouterStats } from './spr';

// ---------------------------------------------------------------------------
// Full All-Teams Export helpers (client-side)
// ---------------------------------------------------------------------------

function escapeCsv(val: unknown): string {
    const s = String(val ?? '').replace(/"/g, '""');
    return `"${s}"`;
}

export function exportAllTeamsToCSV(teams: TeamExportRow[], eventKey: string): void {
    const headers = [
        'Rank', 'Team #', 'Team Name',
        'Matches Scouted', 'Our EPA', 'Statbotics EPA',
        'W', 'L', 'T', 'RP',
        'Failure Rate', 'Consistency', 'Risk Level',
        'Synergy Score', 'Role', 'Strengths',
        // Pit
        'Drivebase', 'Climb', 'Climb Partners', 'Auto Climb',
        'Hopper Capacity', 'Trench', 'Bump', 'Can Lob', 'Can Doze',
        'Pickup Floor', 'Pickup Outpost', 'Kitbot',
        'Robot Quality', 'Pit Quality',
        // Notes
        'Pit Notes', 'All Match Notes',
        // Match summary
        'Avg Auto Fuel', 'Avg Tele Fuel', 'Best Climb', 'Mech Failures',
    ];

    const rows = teams.map((t, i) => {
        const avgAutoFuel = t.matchData.length
            ? (t.matchData.reduce((s, m) => s + m.autoFuel, 0) / t.matchData.length).toFixed(1)
            : '0';
        const avgTeleFuel = t.matchData.length
            ? (t.matchData.reduce((s, m) => s + m.teleFuel, 0) / t.matchData.length).toFixed(1)
            : '0';
        const climbOrder = ['Level3', 'Level2', 'Level1', 'No Attempt'];
        const bestClimb = t.matchData.reduce((best, m) => {
            const score = (val: string) => 3 - climbOrder.indexOf(val);
            return score(m.teleClimb) > score(best) ? m.teleClimb : best;
        }, 'No Attempt');
        const mechFails = t.matchData.filter(m => m.mechFailure).length;

        return [
            t.rank ?? (i + 1),
            t.teamNumber,
            escapeCsv(t.teamName),
            t.matchesScouted,
            t.ourEPA.toFixed(2),
            t.sbEPA?.toFixed(2) ?? 'N/A',
            t.wins, t.losses, t.ties, t.rankingPoints,
            (t.failureRate * 100).toFixed(0) + '%',
            t.consistencyScore.toFixed(0),
            t.riskLevel.toUpperCase(),
            t.synergyScore.toFixed(1),
            escapeCsv(t.role.replace(/_/g, ' ')),
            escapeCsv(t.strengths.join('; ')),
            // Pit
            escapeCsv(t.pitDrivebase),
            escapeCsv(t.pitClimb),
            t.pitClimbPartners,
            escapeCsv(t.pitAutoClimb),
            t.pitHopperCapacity ?? '',
            escapeCsv(t.pitTrench),
            escapeCsv(t.pitBump),
            escapeCsv(t.pitCanLob),
            escapeCsv(t.pitCanDoze),
            escapeCsv(t.pitPickupFloor),
            escapeCsv(t.pitPickupOutpost),
            escapeCsv(t.pitKitbot),
            t.pitRobotQuality,
            t.pitPitQuality,
            // Notes
            escapeCsv(t.pitNotes),
            escapeCsv(t.allNotes.filter((n, i, a) => a.indexOf(n) === i).join(' | ')),
            // Match summary
            avgAutoFuel,
            avgTeleFuel,
            escapeCsv(bestClimb),
            mechFails,
        ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    downloadFile(csvContent, `${eventKey}_all_teams_export.csv`, 'text/csv');
}

export function exportAllTeamsToJSON(teams: TeamExportRow[], eventKey: string): void {
    const content = JSON.stringify(teams, null, 2);
    downloadFile(content, `${eventKey}_all_teams_export.json`, 'application/json');
}

export function exportObjectToJSON(data: unknown, filename: string): void {
    const content = JSON.stringify(data, null, 2);
    downloadFile(content, filename.endsWith('.json') ? filename : `${filename}.json`, 'application/json');
}

export function exportAllTeamsToTextReport(teams: TeamExportRow[], eventKey: string): void {
    const climbOrder = ['Level3', 'Level2', 'Level1', 'No Attempt'];
    const lines = [
        `╔══════════════════════════════════════════════════════════════╗`,
        `  HOWDY SCOUT — FULL TEAM REPORT`,
        `  Event: ${eventKey.toUpperCase()}`,
        `  Generated: ${new Date().toLocaleString()}`,
        `  Teams: ${teams.length}  |  Scouted: ${teams.filter(t => t.matchesScouted > 0).length}`,
        `╚══════════════════════════════════════════════════════════════╝`,
        '',
    ];

    teams.forEach((t, i) => {
        const bestClimb = t.matchData.reduce((best, m) => {
            const score = (val: string) => 3 - climbOrder.indexOf(val);
            return score(m.teleClimb) > score(best) ? m.teleClimb : best;
        }, 'No Attempt');
        const avgAutoFuel = t.matchData.length
            ? (t.matchData.reduce((s, m) => s + m.autoFuel, 0) / t.matchData.length).toFixed(1) : '0';
        const avgTeleFuel = t.matchData.length
            ? (t.matchData.reduce((s, m) => s + m.teleFuel, 0) / t.matchData.length).toFixed(1) : '0';

        lines.push(`──────────────────────────────────────────────────────────────`);
        lines.push(`#${i + 1}  TEAM ${t.teamNumber} — ${t.teamName}`);
        lines.push(`   Rank: ${t.rank ?? '?'}  |  W-L-T: ${t.wins}-${t.losses}-${t.ties}  |  RP: ${t.rankingPoints}`);
        lines.push(`   Our EPA: ${t.ourEPA.toFixed(2)}  |  SB EPA: ${t.sbEPA?.toFixed(2) ?? 'N/A'}`);
        lines.push(`   Scouted: ${t.matchesScouted} matches  |  Risk: ${t.riskLevel.toUpperCase()}  |  Consistency: ${t.consistencyScore.toFixed(0)}`);
        lines.push(`   Role: ${t.role.replace(/_/g, ' ')}  |  Synergy: ${t.synergyScore.toFixed(1)}`);
        if (t.strengths.length > 0) lines.push(`   Strengths: ${t.strengths.join(', ')}`);
        lines.push(`   Avg Auto Fuel: ${avgAutoFuel}  |  Avg Tele Fuel: ${avgTeleFuel}  |  Best Climb: ${bestClimb}`);
        if (t.pitDrivebase) {
            lines.push(`   Pit — Drivebase: ${t.pitDrivebase}  |  Climb: ${t.pitClimb}  |  Partners: ${t.pitClimbPartners}`);
            lines.push(`   Hopper: ${t.pitHopperCapacity ?? '?'} balls  |  Trench: ${t.pitTrench}  |  Bump: ${t.pitBump}`);
        }
        const allUniqueNotes = [...new Set([...t.allNotes])].filter(Boolean);
        if (allUniqueNotes.length > 0) {
            lines.push(`   Scout Notes:`);
            allUniqueNotes.forEach(n => lines.push(`     • ${n}`));
        }
        lines.push('');
    });

    lines.push(`══════════════════════════════════════════════════════════════`);
    lines.push(`END OF REPORT — ${eventKey.toUpperCase()}`);

    downloadFile(lines.join('\n'), `${eventKey}_full_report.txt`, 'text/plain');
}

export interface ExportableTeam {
    rank: number;
    teamNumber: string;
    teamName: string;
    ourEPA: number;
    sbEPA: number | null;
    failureRate: number;
    consistencyScore: number;
    notes?: string;
}

/**
 * Export team data to CSV format
 */
export function exportToCSV(teams: ExportableTeam[], filename: string = 'team_export'): void {
    const headers = ['Rank', 'Team Number', 'Team Name', 'Our EPA', 'Statbotics EPA', 'Failure Rate', 'Consistency', 'Notes'];
    const rows = teams.map(t => [
        t.rank,
        t.teamNumber,
        t.teamName,
        t.ourEPA.toFixed(1),
        t.sbEPA?.toFixed(1) || 'N/A',
        (t.failureRate * 100).toFixed(0) + '%',
        t.consistencyScore.toFixed(0),
        t.notes || ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadFile(csvContent, `${filename}.csv`, 'text/csv');
}

/**
 * Export pick list to CSV
 */
export function exportPickList(teams: { rank: number; teamKey: string; score: number; notes: string }[]): void {
    const headers = ['Pick Order', 'Team', 'Synergy Score', 'Notes'];
    const rows = teams.map(t => [t.rank, t.teamKey.replace('frc', ''), t.score.toFixed(1), t.notes]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadFile(csvContent, 'pick_list.csv', 'text/csv');
}

/**
 * Export scouter statistics to CSV
 */
export function exportScouterStatsToCSV(stats: ScouterStats[], eventKey: string): void {
    const headers = [
        'Scouter ID', 'Matches Scouted', 'Avg Note Length', 'SPR (Precision)',
        'Avg Error', 'Bias', 'Variance',
        'Auto Error', 'Teleop Error', 'Endgame Error'
    ];

    const rows = stats.map(s => [
        escapeCsv(s.scoutId),
        s.matchesScouted,
        Math.round(s.otherDataLength || 0),
        s.spr.toFixed(2),
        s.avgError.toFixed(2),
        s.bias.toFixed(2),
        s.variance.toFixed(2),
        s.autoError.toFixed(2),
        s.teleError.toFixed(2),
        s.endgameError.toFixed(2)
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadFile(csvContent, `${eventKey}_scouter_stats.csv`, 'text/csv');
}

/**
 * Download helper
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Generate simple PDF (text-based, no heavy dependencies)
 */
export function exportToTextReport(teams: ExportableTeam[], eventKey: string): void {
    const lines = [
        `=== SCOUTING REPORT: ${eventKey.toUpperCase()} ===`,
        `Generated: ${new Date().toLocaleString()}`,
        '',
        'TEAM RANKINGS:',
        '-'.repeat(60),
        ...teams.map(t => `#${t.rank} Team ${t.teamNumber} (${t.teamName})`
            + `\n   EPA: ${t.ourEPA.toFixed(1)} | SB: ${t.sbEPA?.toFixed(1) || 'N/A'}`
            + `\n   Reliability: ${(100 - t.failureRate * 100).toFixed(0)}% | Consistency: ${t.consistencyScore.toFixed(0)}`
            + (t.notes ? `\n   Notes: ${t.notes}` : '')
        ),
        '',
        '-'.repeat(60),
        'END OF REPORT'
    ];

    downloadFile(lines.join('\n'), `${eventKey}_report.txt`, 'text/plain');
}
