const STATBOTICS_BASE_URL = 'https://api.statbotics.io/v3';

export interface StatboticsTeamEvent {
    team: number;
    year: number;
    event: string;
    team_name: string;
    event_name: string;
    state: string;
    country: string;
    district: string;
    type: string;
    week: number;
    status: string;
    first_event: boolean;
    epa: {
        total_points: { mean: number; sd: number };
        unitless: number;
        norm: number;
        conf: number[];
        breakdown: {
            total_points: number;
            auto_points: number;
            teleop_points: number;
            endgame_points: number;
            auto_rp: number;
            energized_rp: number;
            supercharged_rp: number;
            traversal_rp: number;
            [key: string]: number;
        };
        stats: {
            start: number;
            pre_elim: number;
            mean: number;
            max: number;
        };
    };
    record: {
        qual: { wins: number; losses: number; ties: number; count: number; winrate: number; rps: number; rank: number };
        total: { wins: number; losses: number; ties: number; count: number; winrate: number };
    };
}

export async function getStatboticsTeamEvent(team: number | string, event: string): Promise<StatboticsTeamEvent | null> {
    const teamNum = typeof team === 'string' ? parseInt(team.replace('frc', '')) : team;
    try {
        const response = await fetch(`${STATBOTICS_BASE_URL}/team_event/${teamNum}/${event}`, {
            next: { revalidate: 3600 } // Cache for 1 hour
        });
        if (!response.ok) return null;
        return response.json();
    } catch (e) {
        console.warn(`Statbotics API Error for team ${team} at ${event}:`, e);
        return null;
    }
}

export async function getStatboticsEvent(event: string): Promise<StatboticsTeamEvent[]> {
    try {
        const response = await fetch(`${STATBOTICS_BASE_URL}/team_events?event=${event}`, {
            next: { revalidate: 3600 }
        });
        if (!response.ok) return [];
        return response.json();
    } catch (e) {
        console.warn(`Statbotics Event Error for ${event}:`, e);
        return [];
    }
}
