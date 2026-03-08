import { getEventMatches, getTeamStatus, getEventTeams, getEventRankings, TBAMatch } from '../tba';

// Global fetch is mocked in jest.setup.ts

describe('tba', () => {
    describe('getEventMatches', () => {
        it('should fetch matches for an event', async () => {
            const mockMatches: TBAMatch[] = [
                {
                    key: '2026txcle_qm1',
                    match_number: 1,
                    comp_level: 'qm',
                    alliances: {
                        red: { score: 100, team_keys: ['frc254', 'frc1678', 'frc973'] },
                        blue: { score: 90, team_keys: ['frc118', 'frc148', 'frc2056'] },
                    },
                },
            ];

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue(mockMatches),
            });

            const result = await getEventMatches('2026txcle');

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('2026txcle/matches'),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'X-TBA-Auth-Key': expect.any(String),
                    }),
                })
            );
            expect(result).toEqual(mockMatches);
        });

        it('should return empty array on failed request', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                statusText: 'Not Found',
            });

            const result = await getEventMatches('invalid');
            expect(result).toEqual([]);
        });
    });

    describe('getTeamStatus', () => {
        it('should fetch team status at event', async () => {
            const mockStatus = {
                qual: { ranking: { rank: 1, record: { wins: 5, losses: 0, ties: 0 } } },
                alliance: null,
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue(mockStatus),
            });

            const result = await getTeamStatus('frc254', '2026txcle');

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('team/frc254/event/2026txcle/status'),
                expect.any(Object)
            );
            expect(result).toEqual(mockStatus);
        });
    });

    describe('getEventTeams', () => {
        it('should fetch teams at event', async () => {
            const mockTeams = [
                { key: 'frc254', team_number: 254, nickname: 'The Cheesy Poofs' },
                { key: 'frc1678', team_number: 1678, nickname: 'Citrus Circuits' },
            ];

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue(mockTeams),
            });

            const result = await getEventTeams('2026txcle');

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('event/2026txcle/teams'),
                expect.any(Object)
            );
            expect(result).toEqual(mockTeams);
        });

        it('should return empty array on error', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
            });

            const result = await getEventTeams('invalid');

            expect(result).toEqual([]);
        });
    });

    describe('getEventRankings', () => {
        it('should fetch event rankings', async () => {
            const mockRankings = {
                rankings: [
                    { rank: 1, team_key: 'frc254', record: { wins: 5, losses: 0, ties: 0 } },
                    { rank: 2, team_key: 'frc1678', record: { wins: 4, losses: 1, ties: 0 } },
                ],
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue(mockRankings),
            });

            const result = await getEventRankings('2026txcle');

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('event/2026txcle/rankings'),
                expect.any(Object)
            );
            expect(result).toEqual(mockRankings);
        });

        it('should return null on error', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
            });

            const result = await getEventRankings('invalid');

            expect(result).toBeNull();
        });
    });
});
