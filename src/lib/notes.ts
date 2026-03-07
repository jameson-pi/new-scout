/**
 * Notes & Highlights System
 * Persist team observations to localStorage
 */

export interface TeamNote {
    teamKey: string;
    note: string;
    highlights: string[];
    updatedAt: number;
}

const STORAGE_KEY = 'scout_team_notes';

/**
 * Get all notes from localStorage
 */
export function getAllNotes(): Record<string, TeamNote> {
    if (typeof window === 'undefined') return {};
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : {};
    } catch {
        return {};
    }
}

/**
 * Get note for a specific team
 */
export function getTeamNote(teamKey: string): TeamNote | null {
    const notes = getAllNotes();
    return notes[teamKey] || null;
}

/**
 * Save note for a team
 */
export function saveTeamNote(teamKey: string, note: string, highlights: string[] = []): void {
    if (typeof window === 'undefined') return;
    const notes = getAllNotes();
    notes[teamKey] = {
        teamKey,
        note,
        highlights,
        updatedAt: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

/**
 * Add a highlight tag to a team
 */
export function addHighlight(teamKey: string, highlight: string): void {
    const note = getTeamNote(teamKey) || { teamKey, note: '', highlights: [], updatedAt: Date.now() };
    if (!note.highlights.includes(highlight)) {
        note.highlights.push(highlight);
    }
    saveTeamNote(teamKey, note.note, note.highlights);
}

/**
 * Remove a highlight tag
 */
export function removeHighlight(teamKey: string, highlight: string): void {
    const note = getTeamNote(teamKey);
    if (note) {
        note.highlights = note.highlights.filter(h => h !== highlight);
        saveTeamNote(teamKey, note.note, note.highlights);
    }
}

/**
 * Get teams with specific highlight
 */
export function getTeamsByHighlight(highlight: string): string[] {
    const notes = getAllNotes();
    return Object.values(notes)
        .filter(n => n.highlights.includes(highlight))
        .map(n => n.teamKey);
}

/**
 * Common highlight tags
 */
export const HIGHLIGHT_TAGS = [
    'WATCH',         // Keep an eye on
    'PICK',          // Want to pick
    'AVOID',         // Don't want to face
    'STRONG AUTO',   // Good autonomous
    'WEAK AUTO',     // Poor autonomous
    'GREAT DRIVER',  // Excellent driver
    'UNRELIABLE',    // Mechanical issues
    'TOWER MASTER',  // Reliable tower climber
    'FUEL MACHINE',  // High FUEL throughput
    'HUB CONTROL'    // Hub shift dominance
] as const;
