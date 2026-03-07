/**
 * Tests for actions.ts (Server Actions) — REBUILT 2026 / Azure SQL Edition
 */

const dbMocks = {
    query: jest.fn(),
    input: jest.fn(),
    request: jest.fn(),
    getPool: jest.fn(),
};

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

jest.mock('../ai', () => ({
    generateMatchStrategy: jest.fn(),
}));

import { saveScoutReport, getTacticalStrategy } from '../actions';
import { generateMatchStrategy } from '../ai';

const baseReport = {
    team: 'frc254',
    match: '2026txcle_qm5',
    scouter: 'TestScout',
    eventKey: '2026txcle',
    auto: { fuel: 10, towerLevel: 'None', moved: true },
    tele: { fuel: 20, towerLevel: 'Level3' },
    trench_capable: true,
    hub_control: 'Average',
    defender_rating: 3,
    mech_failure: false,
    notes: 'Great match!',
};

describe('actions (SQL)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        dbMocks.input.mockImplementation(() => ({ input: dbMocks.input, query: dbMocks.query }));
        dbMocks.request.mockReturnValue({ input: dbMocks.input, query: dbMocks.query });
        dbMocks.getPool.mockResolvedValue({ request: dbMocks.request });
        dbMocks.query.mockResolvedValue({ rowsAffected: [1] });
    });

    describe('saveScoutReport', () => {
        it('should call DB insert and return success', async () => {
            const result = await saveScoutReport(baseReport);
            expect(dbMocks.query).toHaveBeenCalled();
            expect(result.success).toBe(true);
        });

        it('should return error on DB failure', async () => {
            dbMocks.query.mockRejectedValue(new Error('DB Write error'));
            const result = await saveScoutReport(baseReport);
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should handle report without optional fields', async () => {
            const minimal = {
                team: 'frc254',
                match: '2026txcle_qm1',
                scouter: 'Scout',
                auto: { fuel: 10, towerLevel: 'None', moved: true },
                tele: { fuel: 20, towerLevel: 'Level1' },
            };
            const result = await saveScoutReport(minimal);
            expect(result.success).toBe(true);
        });

        it('should correctly set auto_total input', async () => {
            // auto: 5 fuel + moved = 8pts
            const report = { ...baseReport, auto: { fuel: 5, towerLevel: 'None', moved: true }, tele: { fuel: 0, towerLevel: 'None' } };
            await saveScoutReport(report);
            const autoTotalCall = dbMocks.input.mock.calls.find((c: any[]) => c[0] === 'auto_total');
            expect(autoTotalCall).toBeDefined();
            expect(autoTotalCall![2]).toBe(8); // 5 fuel + 3 mobility
        });

        it('should correctly compute Level1 auto tower (15pts)', async () => {
            const report = { ...baseReport, auto: { fuel: 0, towerLevel: 'Level1', moved: false }, tele: { fuel: 0, towerLevel: 'None' } };
            await saveScoutReport(report);
            const autoTotalCall = dbMocks.input.mock.calls.find((c: any[]) => c[0] === 'auto_total');
            expect(autoTotalCall![2]).toBe(15);
        });

        it('should strip frc prefix from team number', async () => {
            await saveScoutReport(baseReport);
            const frcInput = dbMocks.input.mock.calls.find((c: any[]) => c[0] === 'frc_team');
            expect(frcInput![2]).toBe(254);
        });

        it('should default eventKey to 2026txcle when not provided', async () => {
            const report = { ...baseReport };
            delete (report as any).eventKey;
            await saveScoutReport(report);
            const eventInput = dbMocks.input.mock.calls.find((c: any[]) => c[0] === 'event_key');
            expect(eventInput![2]).toBe('2026txcle');
        });
    });

    describe('getTacticalStrategy', () => {
        it('should call AI strategy generator', async () => {
            const mockStrategy = 'Focus on high fuel throughput...';
            (generateMatchStrategy as jest.Mock).mockResolvedValue(mockStrategy);

            const result = await getTacticalStrategy(
                '2026txcle_qm5', 'red',
                [{ teamKey: 'frc254' }],
                [{ teamKey: 'frc1678' }]
            );

            expect(generateMatchStrategy).toHaveBeenCalledWith(
                '2026txcle_qm5', 'red',
                [{ teamKey: 'frc254' }],
                [{ teamKey: 'frc1678' }]
            );
            expect(result).toBe(mockStrategy);
        });

        it('should return fallback message on error', async () => {
            (generateMatchStrategy as jest.Mock).mockRejectedValue(new Error('AI Error'));
            const result = await getTacticalStrategy('2026txcle_qm5', 'red', [], []);
            expect(result).toBe('Tactical link severed.');
        });
    });
});
