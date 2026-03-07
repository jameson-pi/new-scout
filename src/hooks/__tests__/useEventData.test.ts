/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from '@testing-library/react';

// Mock SWR
jest.mock('swr', () => {
    return jest.fn((key, fetcher) => {
        return {
            data: undefined,
            error: undefined,
            isLoading: true,
            mutate: jest.fn(),
        };
    });
});

import useSWR from 'swr';
import { useEventRankings, useEventMatches, useTeamStatus } from '../useEventData';

describe('useEventData hooks', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('useEventRankings', () => {
        it('should call useSWR with correct URL', () => {
            (useSWR as jest.Mock).mockReturnValue({
                data: { rankings: [{ rank: 1, team_key: 'frc254' }] },
                error: undefined,
                isLoading: false,
                mutate: jest.fn(),
            });

            const { result } = renderHook(() => useEventRankings('2026txcle'));

            expect(useSWR).toHaveBeenCalledWith(
                expect.stringContaining('2026txcle/rankings'),
                expect.any(Function),
                expect.objectContaining({ refreshInterval: 30000 })
            );
            expect(result.current.rankings).toHaveLength(1);
        });

        it('should return empty rankings array when no data', () => {
            (useSWR as jest.Mock).mockReturnValue({
                data: undefined,
                error: undefined,
                isLoading: true,
                mutate: jest.fn(),
            });

            const { result } = renderHook(() => useEventRankings('2026txcle'));

            expect(result.current.rankings).toEqual([]);
            expect(result.current.isLoading).toBe(true);
        });

        it('should use custom refresh interval', () => {
            (useSWR as jest.Mock).mockReturnValue({
                data: undefined,
                error: undefined,
                isLoading: true,
                mutate: jest.fn(),
            });

            renderHook(() => useEventRankings('2026txcle', 60000));

            expect(useSWR).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(Function),
                expect.objectContaining({ refreshInterval: 60000 })
            );
        });

        it('should expose refresh function', () => {
            const mockMutate = jest.fn();
            (useSWR as jest.Mock).mockReturnValue({
                data: undefined,
                error: undefined,
                isLoading: false,
                mutate: mockMutate,
            });

            const { result } = renderHook(() => useEventRankings('2026txcle'));

            expect(result.current.refresh).toBe(mockMutate);
        });

        it('should expose error state', () => {
            const mockError = new Error('Failed to fetch');
            (useSWR as jest.Mock).mockReturnValue({
                data: undefined,
                error: mockError,
                isLoading: false,
                mutate: jest.fn(),
            });

            const { result } = renderHook(() => useEventRankings('2026txcle'));

            expect(result.current.isError).toBe(mockError);
        });
    });

    describe('useEventMatches', () => {
        it('should call useSWR with correct URL', () => {
            (useSWR as jest.Mock).mockReturnValue({
                data: [{ key: '2026txcle_qm1' }],
                error: undefined,
                isLoading: false,
                mutate: jest.fn(),
            });

            const { result } = renderHook(() => useEventMatches('2026txcle'));

            expect(useSWR).toHaveBeenCalledWith(
                expect.stringContaining('2026txcle/matches'),
                expect.any(Function),
                expect.any(Object)
            );
            expect(result.current.matches).toHaveLength(1);
        });

        it('should return empty matches array when no data', () => {
            (useSWR as jest.Mock).mockReturnValue({
                data: undefined,
                error: undefined,
                isLoading: true,
                mutate: jest.fn(),
            });

            const { result } = renderHook(() => useEventMatches('2026txcle'));

            expect(result.current.matches).toEqual([]);
        });
    });

    describe('useTeamStatus', () => {
        it('should call useSWR with correct URL', () => {
            (useSWR as jest.Mock).mockReturnValue({
                data: { qual: { ranking: { rank: 1 } } },
                error: undefined,
                isLoading: false,
            });

            const { result } = renderHook(() => useTeamStatus('2026txcle', 'frc254'));

            expect(useSWR).toHaveBeenCalledWith(
                expect.stringContaining('team/frc254/event/2026txcle/status'),
                expect.any(Function),
                expect.any(Object)
            );
            expect(result.current.status).toBeDefined();
        });

        it('should return undefined status when loading', () => {
            (useSWR as jest.Mock).mockReturnValue({
                data: undefined,
                error: undefined,
                isLoading: true,
            });

            const { result } = renderHook(() => useTeamStatus('2026txcle', 'frc254'));

            expect(result.current.status).toBeUndefined();
            expect(result.current.isLoading).toBe(true);
        });
    });
});
