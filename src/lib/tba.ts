const TBA_BASE_URL = 'https://www.thebluealliance.com/api/v3';
const TBA_KEY = process.env.NEXT_PUBLIC_TBA_API_KEY;

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
    const response = await fetch(`${TBA_BASE_URL}/event/${eventKey}/matches`, {
        headers: {
            'X-TBA-Auth-Key': TBA_KEY || '',
        },
        // Cache for 60 seconds to avoid hitting rate limits too hard during dev
        next: { revalidate: 60 }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch matches for ${eventKey}: ${response.statusText}`);
    }

    return response.json();
}

export async function getTeamStatus(teamKey: string, eventKey: string) {
    const response = await fetch(`${TBA_BASE_URL}/team/${teamKey}/event/${eventKey}/status`, {
        headers: { 'X-TBA-Auth-Key': TBA_KEY || '' },
        next: { revalidate: 600 }
    });
    return response.json();
}
