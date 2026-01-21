import fs from 'fs';
import path from 'path';
import { ScoutReport, ReefscapeData } from './spr';
import { getEventMatches } from './tba';

/**
 * Robust CSV Parser (no external deps)
 */
function parseCSV(csvText: string) {
    const lines = csvText.split(/\r?\n/);
    const headers = lines[0].split(',');
    return lines.slice(1).filter(l => l.trim()).map(line => {
        // Handle quoted strings correctly
        const values: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"' && line[i + 1] === '"') {
                current += '"';
                i++;
            } else if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current);

        const obj: any = {};
        headers.forEach((h, i) => {
            obj[h.trim()] = values[i]?.trim();
        });
        return obj;
    });
}

/**
 * Loads a specific event CSV and converts to ScoutReport format
 */
export function loadEventReports(eventKey: string): ScoutReport[] {
    try {
        const filePath = path.join(process.cwd(), 'public', `${eventKey}.csv`);
        if (!fs.existsSync(filePath)) {
            console.warn(`Event data not found for ${eventKey}`);
            return [];
        }
        const csvText = fs.readFileSync(filePath, 'utf-8');
        const rawData = parseCSV(csvText);

        return rawData
            .filter(row => row.frc_team && !isNaN(parseInt(row.frc_team)))
            .map(row => {
                const alliance = row.driver_station?.startsWith('red') ? 'red' : 'blue';

                const data: ReefscapeData = {
                    auto: {
                        coral_l1: parseInt(row.auto_coral_l1) || 0,
                        coral_l2: parseInt(row.auto_coral_l2) || 0,
                        coral_l3: parseInt(row.auto_coral_l3) || 0,
                        coral_l4: parseInt(row.auto_coral_l4) || 0,
                        algae_processor: parseInt(row.auto_algae_processor) || 0,
                        algae_net: parseInt(row.auto_algae_barge) || 0,
                        moved: row.auto_moved === 'Yes'
                    },
                    teleop: {
                        coral_l1: parseInt(row.tele_coral_l1) || 0,
                        coral_l2: parseInt(row.tele_coral_l2) || 0,
                        coral_l3: parseInt(row.tele_coral_l3) || 0,
                        coral_l4: parseInt(row.tele_coral_l4) || 0,
                        algae_processor: parseInt(row.tele_algae_processor) || 0,
                        algae_net: parseInt(row.tele_algae_barge) || 0,
                        climb: parseClimb(row.tele_endgame)
                    },
                    notes: row.other_notes || '',
                    mech_failure: row.mech_failure === 'Yes',
                    defender_rating: parseInt(row.defender_rating) || 0
                };

                return {
                    scoutId: row.scouted_by,
                    matchKey: row.match_key,
                    teamKey: `frc${row.frc_team}`,
                    alliance: alliance as 'red' | 'blue',
                    data
                };
            })
            .sort((a, b) => {
                const numA = parseInt(a.matchKey.split('_qm')[1]) || 0;
                const numB = parseInt(b.matchKey.split('_qm')[1]) || 0;
                return numA - numB;
            });
    } catch (e) {
        console.error(`Error loading reports for ${eventKey}:`, e);
        return [];
    }
}

function parseClimb(val: string): 'None' | 'Park' | 'Shallow' | 'Deep' {
    if (val?.includes('Deep')) return 'Deep';
    if (val?.includes('Shallow')) return 'Shallow';
    if (val?.includes('Park')) return 'Park';
    return 'None';
}

/**
 * Unified getter for Simulation, SPR, and Dashboard
 */
export async function getMissionData(eventKey: string = '2025txwac') {
    const reports = loadEventReports(eventKey);
    const tbaMatchesRaw = await getEventMatches(eventKey);

    // Map TBA matches to the format SPR expects
    const tbaMatches: any = {};
    tbaMatchesRaw.forEach((m: any) => {
        tbaMatches[m.key] = {
            matchKey: m.key,
            alliances: {
                red: {
                    score: m.alliances.red.score,
                    autoPoints: m.score_breakdown?.red?.autoPoints || 0,
                    teleopPoints: m.score_breakdown?.red?.teleopPoints || 0,
                    endgamePoints: m.score_breakdown?.red?.endgamePoints || 0
                },
                blue: {
                    score: m.alliances.blue.score,
                    autoPoints: m.score_breakdown?.blue?.autoPoints || 0,
                    teleopPoints: m.score_breakdown?.blue?.teleopPoints || 0,
                    endgamePoints: m.score_breakdown?.blue?.endgamePoints || 0
                }
            }
        };
    });

    return { reports, tbaMatches, tbaMatchesRaw };
}

export async function getEventSchedule(eventKey: string) {
    const tbaMatchesRaw = await getEventMatches(eventKey);
    return tbaMatchesRaw
        .filter(m => m.comp_level === 'qm')
        .map(m => ({
            key: m.key,
            matchNumber: m.match_number,
            red: m.alliances.red.team_keys,
            blue: m.alliances.blue.team_keys
        }))
        .sort((a, b) => a.matchNumber - b.matchNumber);
}

export function getUniqueScouters(eventKey: string = '2025txwac'): string[] {
    const reports = loadEventReports(eventKey);
    const scouters = Array.from(new Set(reports.map(r => r.scoutId))).filter(Boolean).sort();
    return scouters;
}

/**
 * Discovers available mission datasets in the public directory
 */
export function getAvailableEvents() {
    const publicDir = path.join(process.cwd(), 'public');
    const files = fs.readdirSync(publicDir);
    const csvs = files.filter(f => f.endsWith('.csv'));

    const eventMetadata: Record<string, { name: string, location: string }> = {
        '2025txwac': { name: 'Waco District', location: 'Waco, TX' },
        '2025txman': { name: 'Manor District', location: 'Manor, TX' },
        '2025txcmp2': { name: 'State Championship', location: 'Houston, TX' }
    };

    return csvs.map(f => {
        const key = f.replace('.csv', '');
        return {
            key,
            ...(eventMetadata[key] || { name: key.toUpperCase(), location: 'MISSION THEATER' })
        };
    }).sort((a, b) => b.key.localeCompare(a.key)); // Newest events first
}
