import { queryOptions } from '@tanstack/react-query';

import {
    NaviseerrError,
    nvsRequest,
    segment,
} from '/@/renderer/features/naviseerr/api/naviseerr-client';
import {
    ActiveDownload,
    ActiveDownloads,
    LibrarySongState,
    NvsArtistPage,
    NvsCollection,
    Session,
    Status,
} from '/@/renderer/features/naviseerr/api/types';

// Keys start with 'naviseerr' and the address, never a Feishin serverId: it is another server.
export const nvsKeys = {
    activeDownloads: (address: null | string) => [...nvsKeys.root(address), 'downloads', 'active'],
    librarySongs: (address: null | string) => [...nvsKeys.root(address), 'library-songs'],
    root: (address: null | string) => ['naviseerr', address] as const,
};

export const naviseerrQueries = {
    activeDownloads: (address: null | string) =>
        queryOptions({
            enabled: !!address,
            queryFn: ({ signal }) => nvsRequest<ActiveDownloads>('/downloads/active', { signal }),
            queryKey: nvsKeys.activeDownloads(address),
            retry: false,
        }),
    artist: (address: null | string, channelId: string) =>
        queryOptions({
            enabled: !!address,
            queryFn: ({ signal }) =>
                nvsRequest<NvsArtistPage>(`/artists/${segment(channelId)}`, { signal }),
            queryKey: [...nvsKeys.root(address), 'artist', channelId],
            retry: false,
            staleTime: 5 * 60_000,
        }),
    collection: (address: null | string, id: string, type: 'ALBUM' | 'PLAYLIST') =>
        queryOptions({
            enabled: !!address,
            queryFn: ({ signal }) =>
                nvsRequest<NvsCollection>(`/collections/${segment(id)}?type=${type}`, { signal }),
            queryKey: [...nvsKeys.root(address), 'collection', type, id],
            retry: false,
            staleTime: 5 * 60_000,
        }),
    // S2; an older server answers 404, which means "nothing known" (every row shows Download).
    librarySongs: (address: null | string, ids: string[]) =>
        queryOptions({
            enabled: !!address && ids.length > 0,
            queryFn: async ({ signal }) => {
                const answer: Record<string, LibrarySongState> = {};
                for (let i = 0; i < ids.length; i += 200) {
                    const chunk = ids
                        .slice(i, i + 200)
                        .map(segment)
                        .join(',');
                    try {
                        Object.assign(
                            answer,
                            await nvsRequest<Record<string, LibrarySongState>>(
                                `/library/songs?ids=${chunk}`,
                                { signal },
                            ),
                        );
                    } catch (error) {
                        if ((error as NaviseerrError).status !== 404) throw error;
                    }
                }
                return answer;
            },
            queryKey: [...nvsKeys.librarySongs(address), ids.join(',')],
            retry: false,
        }),
    session: (address: null | string) =>
        queryOptions({
            enabled: !!address,
            queryFn: ({ signal }) => nvsRequest<Session>('/auth/session', { signal }),
            queryKey: [...nvsKeys.root(address), 'session'],
            retry: false,
        }),
    status: (address: null | string) =>
        queryOptions({
            enabled: !!address,
            queryFn: ({ signal }) => nvsRequest<Status>('/status', { signal }),
            queryKey: [...nvsKeys.root(address), 'status'],
            retry: false,
            staleTime: 60_000,
        }),
};

/** 202 for a new download, 409 when it is already queued, running or in the library: both carry the download. */
const requestDownload = async (path: string): Promise<ActiveDownload> => {
    try {
        return await nvsRequest<ActiveDownload>(path, { method: 'POST' });
    } catch (error) {
        const body = (error as NaviseerrError).body;
        if ((error as NaviseerrError).status === 409 && body?.downloadId) return body;
        throw error;
    }
};

export const downloadSong = (youtubeId: string) =>
    requestDownload(`/download/song/${segment(youtubeId)}`);

export const downloadCollection = (id: string, type: 'ALBUM' | 'PLAYLIST') =>
    requestDownload(`/download/collection/${segment(id)}?type=${type}`);
