/**
 * Export utilities for CSV/PDF generation
 */

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
