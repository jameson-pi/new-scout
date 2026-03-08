const TBA_BASE_URL = 'https://www.thebluealliance.com/api/v3';
const TBA_KEY = process.env.NEXT_PUBLIC_TBA_API_KEY || process.env.TBA_API_KEY;

// Practice / local events that don't exist on TBA — skip the network call entirely
const LOCAL_ONLY_EVENTS = new Set(['2026howdy']);

function isLocalOnly(eventKey: string) {
    return LOCAL_ONLY_EVENTS.has(eventKey.toLowerCase());
}

if (!TBA_KEY) {
    console.warn("TBA API Key is missing!");
}

export interface TBAMatch {
    key: string;
    match_number: number;
    comp_level: 'qm' | 'qf' | 'sf' | 'f';
    alliances: {
        red: { score: number; team_keys: string[] };
        blue: { score: number; team_keys: string[] };
    };
    score_breakdown?: any; // Detailed breakdown if available
}

export async function getEventMatches(eventKey: string): Promise<TBAMatch[]> {
    if (isLocalOnly(eventKey)) return [];

    const response = await fetch(`${TBA_BASE_URL}/event/${eventKey}/matches`, {
        headers: {
            'X-TBA-Auth-Key': TBA_KEY || '',
        },
        // Cache for 60 seconds to avoid hitting rate limits too hard during dev
        next: { revalidate: 60 }
    });

    if (!response.ok) {
        console.warn(`TBA: no matches for ${eventKey} (${response.status} ${response.statusText})`);
        return [];
    }

    return response.json();
}

export async function getTeamStatus(teamKey: string, eventKey: string) {
    if (isLocalOnly(eventKey)) return null;
    const response = await fetch(`${TBA_BASE_URL}/team/${teamKey}/event/${eventKey}/status`, {
        headers: { 'X-TBA-Auth-Key': TBA_KEY || '' },
        next: { revalidate: 600 }
    });
    if (!response.ok) return null;
    return response.json();
}

export async function getEventTeams(eventKey: string) {
    if (isLocalOnly(eventKey)) return [];
    const response = await fetch(`${TBA_BASE_URL}/event/${eventKey}/teams`, {
        headers: { 'X-TBA-Auth-Key': TBA_KEY || '' },
        next: { revalidate: 86400 }
    });
    if (!response.ok) return [];
    return response.json();
}

export async function getEventRankings(eventKey: string) {
    if (isLocalOnly(eventKey)) return null;
    const response = await fetch(`${TBA_BASE_URL}/event/${eventKey}/rankings`, {
        headers: { 'X-TBA-Auth-Key': TBA_KEY || '' },
        next: { revalidate: 300 }
    });
    if (!response.ok) return null;
    return response.json();
}
