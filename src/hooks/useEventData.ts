'use client';

import useSWR from 'swr';

const TBA_BASE = 'https://www.thebluealliance.com/api/v3';

const fetcher = async (url: string) => {
    const res = await fetch(url, {
        headers: {
            'X-TBA-Auth-Key': process.env.NEXT_PUBLIC_TBA_API_KEY || ''
        }
    });
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
};

/**
 * Hook for auto-refreshing event rankings
 */
export function useEventRankings(eventKey: string, refreshInterval = 30000) {
    const { data, error, isLoading, mutate } = useSWR(
        `${TBA_BASE}/event/${eventKey}/rankings`,
        fetcher,
        { refreshInterval }
    );

    return {
        rankings: data?.rankings || [],
        isLoading,
        isError: error,
        refresh: mutate
    };
}

/**
 * Hook for auto-refreshing event matches
 */
export function useEventMatches(eventKey: string, refreshInterval = 30000) {
    const { data, error, isLoading, mutate } = useSWR(
        `${TBA_BASE}/event/${eventKey}/matches`,
        fetcher,
        { refreshInterval }
    );

    return {
        matches: data || [],
        isLoading,
        isError: error,
        refresh: mutate
    };
}

/**
 * Hook for team status at event
 */
export function useTeamStatus(eventKey: string, teamKey: string, refreshInterval = 30000) {
    const { data, error, isLoading } = useSWR(
        `${TBA_BASE}/team/${teamKey}/event/${eventKey}/status`,
        fetcher,
        { refreshInterval }
    );

    return {
        status: data,
        isLoading,
        isError: error
    };
}
