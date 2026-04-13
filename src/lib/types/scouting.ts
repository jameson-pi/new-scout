export interface RebuiltData {
    auto: {
        fuel_scored: number;
        climb_level: 'No Attempt' | 'Level1';
        moved: boolean;
    };
    teleop: {
        fuel_scored: number;
        climb_level: 'No Attempt' | 'Level1' | 'Level2' | 'Level3';
    };
    notes?: string;
    mech_failure?: boolean;
    defender_rating?: number;
    hub_control?: 'Dominant' | 'Average' | 'Weak';
    trench_capable?: boolean;
}

export interface ScoutReport {
    scoutId: string;
    matchKey: string;
    teamKey: string;
    alliance: 'red' | 'blue';
    data: RebuiltData;
}

export interface TBAMatchResult {
    matchKey: string;
    alliances: {
        red: { score: number; autoPoints: number; teleopPoints: number; endgamePoints: number };
        blue: { score: number; autoPoints: number; teleopPoints: number; endgamePoints: number };
    };
}

export interface ScouterStats {
    scoutId: string;
    matchesScouted: number;
    avgError: number;
    variance: number;
    bias: number;
    spr: number;
    autoError: number;
    teleError: number;
    endgameError: number;
    otherDataLength: number;
}

export interface PitReport {
    teamKey: string;
    eventKey: string;
    scoutedBy: string;
    weightLbs?: number;
    heightIn?: number;
    widthIn?: number;
    lengthIn?: number;
    drivebase?: string;
    codeLanguage?: string;
    turret?: string;
    climb?: string;
    climbPosition1?: string;
    climbPosition2?: string;
    climbPartners?: number;
    autoClimb?: string;
    autoPrefStart?: string;
    autoPrefPickup?: string;
    hopperCapacity?: number;
    hopperLengthIn?: number;
    hopperWidthIn?: number;
    hopperHeightIn?: number;
    trench?: string;
    bump?: string;
    bumpPractice?: string;
    canLob?: string;
    canDoze?: string;
    pickupFloor?: string;
    pickupOutpost?: string;
    preferredDs?: string;
    shiftTracking?: string;
    kitbot?: string;
    kitbotModified?: string;
    humanPlayer?: string;
    humanPlayerHeight?: string;
    robotQuality?: number;
    pitQuality?: number;
    otherNotes?: string;
    robotImageUrl?: string;
}

export interface TBAAlliance {
    score: number;
    team_keys: string[];
    surrogate_team_keys?: string[];
    dq_team_keys?: string[];
}

export interface TBAMatchRaw {
    key: string;
    comp_level: string;
    set_number: number;
    match_number: number;
    alliances: {
        red: TBAAlliance;
        blue: TBAAlliance;
    };
    score_breakdown?: {
        red?: {
            autoPoints?: number;
            teleopPoints?: number;
            endgamePoints?: number;
        };
        blue?: {
            autoPoints?: number;
            teleopPoints?: number;
            endgamePoints?: number;
        };
    };
}

export interface StatboticsTeamEvent {
    team: number;
    event: string;
    epa: {
        breakdown: {
            total_points: number;
        };
    };
    record: {
        qual: {
            rank: number;
            wins: number;
            losses: number;
            ties: number;
            rps: number;
        };
    };
}

