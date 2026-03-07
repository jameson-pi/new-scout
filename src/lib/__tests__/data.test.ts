/**
 * Tests for data.ts (REBUILT 2026) — Azure SQL Edition
 */

// jest.mock is hoisted, so we cannot reference variables declared before it
// inside the factory. Instead we define the mock functions inside the factory
// and expose them via a module-level object that tests import.
const dbMocks = {
    query: jest.fn(),
    input: jest.fn(),
    request: jest.fn(),
    getPool: jest.fn(),
};

// Wire up chainable input mock
dbMocks.input.mockImplementation(() => ({ input: dbMocks.input, query: dbMocks.query }));
dbMocks.request.mockReturnValue({ input: dbMocks.input, query: dbMocks.query });
dbMocks.getPool.mockResolvedValue({ request: dbMocks.request });

jest.mock('../db', () => ({
    get getPool() { return dbMocks.getPool; },
    sql: {
        NVarChar: (v?: any) => `NVarChar(${v ?? 'MAX'})`,
        Int: 'Int',
        Bit: 'Bit',
        MAX: 'MAX',
    },
}));

jest.mock('../tba', () => ({
    getEventMatches: jest.fn(),
}));

import { loadEventReports, getUniqueScouters, getAvailableEvents } from '../data';

describe('data (SQL)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        dbMocks.input.mockImplementation(() => ({ input: dbMocks.input, query: dbMocks.query }));
        dbMocks.request.mockReturnValue({ input: dbMocks.input, query: dbMocks.query });
        dbMocks.getPool.mockResolvedValue({ request: dbMocks.request });
    });

    describe('loadEventReports', () => {
        it('should return empty array if DB query fails', async () => {
            dbMocks.query.mockRejectedValue(new Error('DB error'));
            const result = await loadEventReports('2026txcle');
            expect(result).toEqual([]);
        });

        it('should convert DB rows to ScoutReport format', async () => {
            dbMocks.query.mockResolvedValue({
                recordset: [{
                    frc_team: 254,
                    match_key: '2026txcle_qm1',
                    driver_station: 'red1',
                    scouted_by: 'Scout1',
                    auto_fuel_scored: 10,
                    auto_tower_level: 'None',
                    auto_moved: true,
                    tele_fuel_scored: 20,
                    tele_tower_level: 'Level1',
                    other_notes: 'Great robot',
                    mech_failure: false,
                    defender_rating: 3,
                    trench_capable: true,
                    hub_control: 'Average',
                }],
            });

            const result = await loadEventReports('2026txcle');
            expect(result).toHaveLength(1);
            expect(result[0].teamKey).toBe('frc254');
            expect(result[0].matchKey).toBe('2026txcle_qm1');
            expect(result[0].alliance).toBe('red');
            expect(result[0].scoutId).toBe('Scout1');
            expect(result[0].data.auto.fuel_scored).toBe(10);
            expect(result[0].data.auto.moved).toBe(true);
            expect(result[0].data.teleop.tower_level).toBe('Level1');
        });

        it('should parse tower levels correctly', async () => {
            dbMocks.query.mockResolvedValue({
                recordset: [
                    { frc_team: 254,  match_key: '2026txcle_qm1', driver_station: 'red1', scouted_by: 'S', auto_fuel_scored: 0, auto_tower_level: 'None', auto_moved: false, tele_fuel_scored: 0, tele_tower_level: 'Level3', other_notes: '', mech_failure: false, defender_rating: 3, trench_capable: false, hub_control: null },
                    { frc_team: 1678, match_key: '2026txcle_qm2', driver_station: 'red1', scouted_by: 'S', auto_fuel_scored: 0, auto_tower_level: 'None', auto_moved: false, tele_fuel_scored: 0, tele_tower_level: 'Level2', other_notes: '', mech_failure: false, defender_rating: 3, trench_capable: false, hub_control: null },
                    { frc_team: 973,  match_key: '2026txcle_qm3', driver_station: 'red1', scouted_by: 'S', auto_fuel_scored: 0, auto_tower_level: 'None', auto_moved: false, tele_fuel_scored: 0, tele_tower_level: 'Level1', other_notes: '', mech_failure: false, defender_rating: 3, trench_capable: false, hub_control: null },
                    { frc_team: 118,  match_key: '2026txcle_qm4', driver_station: 'red1', scouted_by: 'S', auto_fuel_scored: 0, auto_tower_level: 'None', auto_moved: false, tele_fuel_scored: 0, tele_tower_level: 'None',   other_notes: '', mech_failure: false, defender_rating: 3, trench_capable: false, hub_control: null },
                ],
            });

            const result = await loadEventReports('2026txcle');
            expect(result[0].data.teleop.tower_level).toBe('Level3');
            expect(result[1].data.teleop.tower_level).toBe('Level2');
            expect(result[2].data.teleop.tower_level).toBe('Level1');
            expect(result[3].data.teleop.tower_level).toBe('None');
        });

        it('should handle blue alliance correctly', async () => {
            dbMocks.query.mockResolvedValue({
                recordset: [{
                    frc_team: 1678, match_key: '2026txcle_qm1', driver_station: 'blue2', scouted_by: 'Scout2',
                    auto_fuel_scored: 8, auto_tower_level: 'None', auto_moved: true, tele_fuel_scored: 15,
                    tele_tower_level: 'Level2', other_notes: '', mech_failure: false, defender_rating: 4,
                    trench_capable: false, hub_control: 'Dominant',
                }],
            });

            const result = await loadEventReports('2026txcle');
            expect(result[0].alliance).toBe('blue');
            expect(result[0].data.hub_control).toBe('Dominant');
        });
    });

    describe('getUniqueScouters', () => {
        it('should return scouter names from DB', async () => {
            dbMocks.query.mockResolvedValue({
                recordset: [{ scouted_by: 'Scout1' }, { scouted_by: 'Scout2' }],
            });
            const result = await getUniqueScouters('2026txcle');
            expect(result).toHaveLength(2);
            expect(result).toContain('Scout1');
            expect(result).toContain('Scout2');
        });

        it('should return empty array on DB error', async () => {
            dbMocks.query.mockRejectedValue(new Error('DB error'));
            const result = await getUniqueScouters('2026txcle');
            expect(result).toEqual([]);
        });
    });

    describe('getAvailableEvents', () => {
        it('should return events from DB', async () => {
            dbMocks.query.mockResolvedValue({
                recordset: [
                    { event_key: '2026txcle', name: 'Space City #1', location: 'Houston, TX' },
                    { event_key: '2026txman', name: 'Manor District', location: 'Manor, TX' },
                ],
            });
            const result = await getAvailableEvents();
            expect(result).toHaveLength(2);
            expect(result[0].key).toBe('2026txcle');
            expect(result[0].name).toBe('Space City #1');
        });

        it('should return fallback events on DB error', async () => {
            dbMocks.query.mockRejectedValue(new Error('DB error'));
            const result = await getAvailableEvents();
            expect(result.length).toBeGreaterThan(0);
            expect(result.some((e: any) => e.key === '2026txcle')).toBe(true);
        });
    });
});
