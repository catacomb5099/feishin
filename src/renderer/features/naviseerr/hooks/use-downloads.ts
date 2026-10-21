import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import i18n from '/@/i18n/i18n';
import { queryKeys } from '/@/renderer/api/query-keys';
import { curatedCategory } from '/@/renderer/features/naviseerr/api/map';
import {
    downloadCollection,
    downloadSong,
    naviseerrQueries,
    nvsKeys,
} from '/@/renderer/features/naviseerr/api/naviseerr-api';
import { nvsRequest } from '/@/renderer/features/naviseerr/api/naviseerr-client';
import {
    ActiveDownload,
    ActiveDownloads,
    DownloadType,
    TERMINAL_STAGES,
} from '/@/renderer/features/naviseerr/api/types';
import {
    getNaviseerrAddress,
    useNaviseerrAddress,
} from '/@/renderer/features/naviseerr/store/naviseerr-store';
import { startScanWatch } from '/@/renderer/features/shared/hooks/use-scan-status';
import { queryClient } from '/@/renderer/lib/react-query';
import { useAuthStore } from '/@/renderer/store';
import { toast } from '/@/shared/components/toast/toast';

export const isLive = (download: ActiveDownload) => !TERMINAL_STAGES.includes(download.stage);

type PollListener = (
    previous: ActiveDownloads | undefined,
    next: ActiveDownloads,
) => Promise<void> | void;
const listeners = new Set<PollListener>();
export const onDownloadsPolled = (listener: PollListener) => listeners.add(listener);

const reasons: (() => boolean)[] = [];
/** Keeps the poller going after the downloads settle, for work that follows them. */
export const keepPollingWhile = (reason: () => boolean) => reasons.push(reason);

let timer: null | ReturnType<typeof setTimeout> = null;
let running = false;
let again = false;

// One poller for the whole app, outside React, so a download is followed on every page.
const tick = async () => {
    timer = null;
    const address = getNaviseerrAddress();
    if (!address) return;
    if (running) {
        again = true;
        return;
    }
    running = true;
    let delay: null | number = null;
    const key = nvsKeys.activeDownloads(address);
    const previous = queryClient.getQueryData<ActiveDownloads>(key);
    const wasLive = previous?.downloads.some(isLive);
    try {
        const next = await nvsRequest<ActiveDownloads>('/downloads/active');
        queryClient.setQueryData(key, next);
        if (next.downloads.some(isLive) || reasons.some((reason) => reason())) {
            delay = next.pollIntervalMs || 2000;
        }
        if (delay || wasLive) {
            queryClient.invalidateQueries({ queryKey: nvsKeys.librarySongs(address) });
        }
        await Promise.all([...listeners].map((listener) => listener(previous, next)));
        if (!delay && reasons.some((reason) => reason())) delay = next.pollIntervalMs || 2000;
    } catch {
        // The server went away mid-download: keep trying, slowly.
        delay = wasLive || reasons.some((reason) => reason()) ? 10_000 : null;
    } finally {
        running = false;
        if (again) {
            again = false;
            delay = 0;
        }
        if (delay !== null) timer = setTimeout(tick, delay);
    }
};

export const pollDownloads = () => {
    if (timer) clearTimeout(timer);
    void tick();
};

/** Every download the server is running or finished in the last minutes; starts the poller once. */
export const useActiveDownloads = () => {
    const address = useNaviseerrAddress();
    const query = useQuery({ ...naviseerrQueries.activeDownloads(address), enabled: false });

    useEffect(() => {
        if (address && !timer && !running) void tick();
    }, [address]);

    return query.data?.downloads;
};

/** The newest download of this item, live ones first. */
export const findDownload = (
    downloads: ActiveDownload[] | undefined,
    youtubeId: string,
    type: DownloadType,
) => {
    const category = curatedCategory(youtubeId);
    const [id, kind] = category ? [category, 'CURATED'] : [youtubeId, type];
    const matches = (downloads ?? []).filter(
        (download) => download.youtubeId === id && download.downloadType === kind,
    );
    return matches.find(isLive) ?? matches[0];
};

const remember = (download: ActiveDownload) => {
    const address = getNaviseerrAddress();
    queryClient.setQueryData<ActiveDownloads>(nvsKeys.activeDownloads(address), (old) => ({
        pollIntervalMs: old?.pollIntervalMs ?? 2000,
        terminalRetentionMs: old?.terminalRetentionMs ?? 0,
        ...old,
        downloads: [
            download,
            ...(old?.downloads ?? []).filter((d) => d.downloadId !== download.downloadId),
        ],
    }));
    pollDownloads();
    return download;
};

/** Cancel or retry a whole download (Retry restarts every song without a file). */
export const useDownloadAction = () => (download: ActiveDownload, action: 'cancel' | 'retry') =>
    nvsRequest<ActiveDownload>(`/downloads/${download.downloadId}/${action}`, { method: 'POST' })
        .catch((error) => {
            // 409 = nothing left to cancel or retry; the body is the current card.
            if (error.status === 409 && error.body?.downloadId) return error.body as ActiveDownload;
            throw error;
        })
        .then(remember, fail);

/** A finished download whose files were deleted: ask again past the "already in your library" check. */
export const downloadAgain = (download: ActiveDownload) => {
    const id = encodeURIComponent(download.youtubeId);
    const path =
        download.downloadType === 'SONG'
            ? `/download/song/${id}?force=true`
            : `/download/collection/${id}?type=${download.downloadType}&force=true`;
    return nvsRequest<ActiveDownload>(path, { method: 'POST' }).then(remember, fail);
};

const fail = (error: unknown): never => {
    toast.error({ message: (error as Error).message });
    throw error;
};

const alreadyThere = (download: ActiveDownload) => {
    if (download.stage === 'SUCCEEDED') {
        toast.info({ message: i18n.t('landing.already', { ns: 'naviseerr' }) });
    }
    return download;
};

export const requestSongDownload = (youtubeId: string, quiet = false) =>
    downloadSong(youtubeId)
        .then(remember, fail)
        .then(quiet ? (download) => download : alreadyThere);

export const requestCollectionDownload = (youtubeId: string, type: 'ALBUM' | 'PLAYLIST') =>
    downloadCollection(youtubeId, type).then(remember, fail).then(alreadyThere);

/** One plain sentence for a download that failed. */
export const failureText = (download: ActiveDownload) =>
    i18n.t(`failure.${download.failureCode || 'unknown'}`, {
        defaultValue: i18n.t('failure.unknown', { ns: 'naviseerr' }),
        ns: 'naviseerr',
    });

// A scan can finish before Feishin's scan watch first looks; two late refreshes cover that.
const LIBRARY_REFRESH_MS = [5_000, 20_000];

const refreshLibrary = () => {
    const serverId = useAuthStore.getState().currentServer?.id;
    if (!serverId) return;
    [
        queryKeys.songs.root(serverId),
        queryKeys.albums.root(serverId),
        queryKeys.albumArtists.root(serverId),
        queryKeys.artists.root(serverId),
        queryKeys.playlists.root(serverId),
        queryKeys.search.root(serverId),
        [serverId, 'home'],
    ].forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
};

// Landing: a download seen running is now finished.
onDownloadsPolled((previous, next) => {
    let landed = false;
    for (const download of next.downloads) {
        const before = previous?.downloads.find((d) => d.downloadId === download.downloadId);
        if (!before || !isLive(before) || isLive(download)) continue;
        const title = download.title ?? '';
        if (download.stage === 'FAILED') {
            toast.error({ message: `${title}: ${failureText(download)}` });
            continue;
        }
        landed = true;
        toast.success({
            message: i18n.t(download.stage === 'SUCCEEDED' ? 'landing.added' : 'landing.partial', {
                failed: download.songsFailed,
                ns: 'naviseerr',
                title,
            }),
        });
    }
    if (landed) {
        startScanWatch();
        LIBRARY_REFRESH_MS.forEach((ms) => setTimeout(refreshLibrary, ms));
    }
});
