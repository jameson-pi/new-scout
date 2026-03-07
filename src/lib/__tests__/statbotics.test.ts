import { getStatboticsTeamEvent, getStatboticsEvent, StatboticsTeamEvent } from '../statbotics';

// Global fetch is mocked in jest.setup.ts

describe('statbotics', () => {
    describe('getStatboticsTeamEvent', () => {
        it('should fetch team event data with team number', async () => {
            const mockData: StatboticsTeamEvent = {
                team: 254,
                year: 2026,
                event: '2026txcle',
                team_name: 'The Cheesy Poofs',
                event_name: 'Space City #1',
                state: 'TX',
                country: 'USA',
                district: 'tx',
                type: 'district',
                week: 1,
                status: 'completed',
                first_event: false,
                epa: {
                    total_points: { mean: 45.5, sd: 8.2 },
                    unitless: 1850,
                    norm: 75,
                    conf: [40, 50],
                    breakdown: {
                        total_points: 45.5,
                        auto_points: 15,
                        teleop_points: 25,
                        endgame_points: 5.5,
                        auto_rp: 0.8,
                        energized_rp: 0.6,
                        supercharged_rp: 0.3,
                        traversal_rp: 0.7,
                    },
                    stats: {
                        start: 40,
                        pre_elim: 45,
                        mean: 45.5,
                        max: 52,
                    },
                },
                record: {
                    qual: { wins: 5, losses: 1, ties: 0, count: 6, winrate: 0.83, rps: 16, rank: 1 },
                    total: { wins: 8, losses: 2, ties: 0, count: 10, winrate: 0.8 },
                },
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue(mockData),
            });

            const result = await getStatboticsTeamEvent(254, '2026txcle');

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('team_event/254/2026txcle'),
                expect.any(Object)
            );
            expect(result).toEqual(mockData);
        });

        it('should handle team key string format', async () => {
            const mockData = { team: 254 };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue(mockData),
            });

            await getStatboticsTeamEvent('frc254', '2026txcle');

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('team_event/254/2026txcle'),
                expect.any(Object)
            );
        });

        it('should return null on not found', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
            });

            const result = await getStatboticsTeamEvent(99999, '2026txcle');

            expect(result).toBeNull();
        });

        it('should return null on network error', async () => {
            (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

            const result = await getStatboticsTeamEvent(254, '2026txcle');

            expect(result).toBeNull();
        });
    });

    describe('getStatboticsEvent', () => {
        it('should fetch all teams at event', async () => {
            const mockData: Partial<StatboticsTeamEvent>[] = [
                { team: 254, epa: { breakdown: { total_points: 45 } } } as any,
                { team: 1678, epa: { breakdown: { total_points: 42 } } } as any,
            ];

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue(mockData),
            });

            const result = await getStatboticsEvent('2026txcle');

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('team_events?event=2026txcle'),
                expect.any(Object)
            );
            expect(result).toHaveLength(2);
        });

        it('should return empty array on error', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
            });

            const result = await getStatboticsEvent('invalid');

            expect(result).toEqual([]);
        });

        it('should return empty array on network error', async () => {
            (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

            const result = await getStatboticsEvent('2026txcle');

            expect(result).toEqual([]);
        });
    });
});
