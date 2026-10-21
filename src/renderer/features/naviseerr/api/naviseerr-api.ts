import { queryOptions } from '@tanstack/react-query';

import i18n from '/@/i18n/i18n';
import { specialCollection } from '/@/renderer/features/naviseerr/api/map';
import {
    NaviseerrError,
    nvsRequest,
    segment,
} from '/@/renderer/features/naviseerr/api/naviseerr-client';
import {
    ActiveDownload,
    ActiveDownloads,
    Candidates,
    DownloadDetail,
    LibrarySongState,
    NvsArtistPage,
    NvsCollection,
    NvsRadio,
    NvsSearch,
    Session,
    SongInfo,
    Status,
    SuggestedPlaylist,
    SuggestedPlaylistDetail,
} from '/@/renderer/features/naviseerr/api/types';
import { toast } from '/@/shared/components/toast/toast';

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
    allDownloads: (address: null | string, pageNumber: number, pageSize: number) =>
        queryOptions({
            enabled: !!address,
            queryFn: ({ signal }) =>
                nvsRequest<{ downloads: ActiveDownload[]; totalPages: number }>(
                    `/downloads/all?pageSize=${pageSize}&pageNumber=${pageNumber}`,
                    { signal },
                ),
            queryKey: [...nvsKeys.root(address), 'downloads', 'all', pageSize, pageNumber],
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
    candidates: (address: null | string, downloadId: string, taskId: string) =>
        queryOptions({
            enabled: !!address,
            queryFn: ({ signal }) =>
                nvsRequest<Candidates>(`/downloads/${downloadId}/tasks/${taskId}/candidates`, {
                    signal,
                }),
            queryKey: [...nvsKeys.root(address), 'candidates', downloadId, taskId],
            refetchInterval: (query) => (query.state.data?.status === 'SEARCHING' ? 3000 : false),
            retry: false,
        }),
    collection: (address: null | string, id: string, type: 'ALBUM' | 'PLAYLIST') =>
        queryOptions({
            enabled: !!address,
            queryFn: ({ signal }) => {
                const special = specialCollection(id);
                if (special?.type === 'CURATED') {
                    return nvsRequest<SuggestedPlaylistDetail>(
                        `/suggested-playlists/${segment(special.key)}`,
                        { signal },
                    ).then((detail) => fromSuggested(id, detail));
                }
                if (special?.type === 'RADIO') {
                    return nvsRequest<NvsRadio>(`/radios/${segment(special.key)}`, { signal }).then(
                        (radio) => fromRadio(id, radio),
                    );
                }
                return nvsRequest<NvsCollection>(`/collections/${segment(id)}?type=${type}`, {
                    signal,
                });
            },
            queryKey: [...nvsKeys.root(address), 'collection', type, id],
            retry: false,
            staleTime: 5 * 60_000,
        }),
    downloadDetail: (address: null | string, downloadId: string) =>
        queryOptions({
            enabled: !!address,
            queryFn: ({ signal }) =>
                nvsRequest<DownloadDetail>(`/downloads/${downloadId}`, { signal }),
            queryKey: [...nvsKeys.root(address), 'downloads', downloadId],
            retry: false,
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
    search: (address: null | string, query: string) =>
        queryOptions({
            enabled: !!address && query.trim() !== '',
            queryFn: ({ signal }) =>
                nvsRequest<NvsSearch>(`/search/${segment(query.trim())}`, { signal }),
            queryKey: [...nvsKeys.root(address), 'search', query.trim()],
            retry: false,
            staleTime: 5 * 60_000,
        }),
    searchKind: (address: null | string, query: string, kind: string, limit: number) =>
        queryOptions({
            enabled: !!address && query.trim() !== '',
            queryFn: ({ signal }) =>
                nvsRequest<NvsSearch>(`/search/${segment(query.trim())}/${kind}?limit=${limit}`, {
                    signal,
                }),
            queryKey: [...nvsKeys.root(address), 'search', query.trim(), kind, limit],
            retry: false,
            staleTime: 5 * 60_000,
        }),
    session: (address: null | string) =>
        queryOptions({
            enabled: !!address,
            queryFn: ({ signal }) => nvsRequest<Session>('/auth/session', { signal }),
            queryKey: [...nvsKeys.root(address), 'session'],
            retry: false,
        }),
    songInfo: (address: null | string, youtubeId: string) =>
        queryOptions({
            enabled: !!address,
            queryFn: ({ signal }) =>
                nvsRequest<SongInfo>(`/songs/${segment(youtubeId)}`, { signal }),
            queryKey: [...nvsKeys.root(address), 'song', youtubeId],
            retry: false,
            staleTime: 60 * 60_000,
        }),
    status: (address: null | string) =>
        queryOptions({
            enabled: !!address,
            queryFn: ({ signal }) =>
                nvsRequest<Status>('/status', { signal }).then((status) => {
                    warnOnce(status);
                    return status;
                }),
            queryKey: [...nvsKeys.root(address), 'status'],
            retry: false,
            staleTime: 60_000,
        }),
    suggested: (address: null | string) =>
        queryOptions({
            enabled: !!address,
            queryFn: ({ signal }) =>
                nvsRequest<{ enabled: boolean; playlists: SuggestedPlaylist[] }>(
                    '/suggested-playlists',
                    { signal },
                ),
            queryKey: [...nvsKeys.root(address), 'suggested'],
            retry: false,
            staleTime: 60 * 60_000,
        }),
};

let warned = false;

/** One warning per session when downloads cannot work right now (the server's own words where it has them). */
const warnOnce = (status: Status) => {
    const problem = !status.youtubeMusic.reachable
        ? i18n.t('outage.youtubeMusic', { ns: 'naviseerr' })
        : !status.soulseek.connected
          ? i18n.t('outage.soulseek', { ns: 'naviseerr' })
          : status.library.problem;
    if (!problem || warned) return;
    warned = true;
    toast.warn({ message: problem });
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

export const downloadCollection = (id: string, type: 'ALBUM' | 'PLAYLIST') => {
    const special = specialCollection(id);
    return requestDownload(
        special
            ? `/download/collection/${segment(special.key)}?type=${special.type}`
            : `/download/collection/${segment(id)}?type=${type}`,
    );
};

/** Start a radio from a song: the server saves it, because YouTube reshuffles radios within minutes. */
export const startRadio = (seed: string) =>
    nvsRequest<NvsRadio>(`/radios?seed=${segment(seed)}`, { method: 'POST' });

const fromRadio = (id: string, radio: NvsRadio): NvsCollection => ({
    artistIds: [],
    artists: radio.artists,
    iconURL: radio.iconURL,
    id,
    name: radio.name,
    playlistId: null,
    trackCount: radio.trackCount,
    tracks: radio.tracks,
    type: 'PLAYLIST',
    views: null,
    year: null,
});

/** A suggested playlist in the shape of a YouTube playlist page. */
const fromSuggested = (id: string, detail: SuggestedPlaylistDetail): NvsCollection => ({
    artistIds: [],
    artists: [],
    iconURL: detail.tracks[0]?.iconURL ?? '',
    id,
    name: detail.title,
    playlistId: null,
    trackCount: detail.tracks.length,
    tracks: detail.tracks.map((track) => ({
        artistIds: [],
        artists: track.artists,
        durationSeconds: null,
        iconURL: track.iconURL,
        id: track.id,
        name: track.name,
        plays: null,
        position: track.position,
    })),
    type: 'PLAYLIST',
    views: null,
    year: null,
});
