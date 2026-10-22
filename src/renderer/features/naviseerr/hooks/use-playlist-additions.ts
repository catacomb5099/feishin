import i18n from '/@/i18n/i18n';
import { queryKeys } from '/@/renderer/api/query-keys';
import { nvsRequest } from '/@/renderer/features/naviseerr/api/naviseerr-client';
import { Addition } from '/@/renderer/features/naviseerr/api/types';
import {
    keepPollingWhile,
    onDownloadsPolled,
    pollDownloads,
} from '/@/renderer/features/naviseerr/hooks/use-downloads';
import { queryClient } from '/@/renderer/lib/react-query';
import { useAuthStore } from '/@/renderer/store';
import { toast } from '/@/shared/components/toast/toast';

const t = (key: string, options: Record<string, unknown> = {}) =>
    i18n.t(key, { ns: 'naviseerr', ...options });

// Settled for this screen: added, given up, or waiting on a download that failed (a retry resumes it).
const SETTLED: Addition['state'][] = ['ADDED', 'GAVE_UP', 'DOWNLOAD_FAILED'];

const names = new Map<string, string>();
const seen = new Map<string, Addition['state']>();
let pending = false;

keepPollingWhile(() => pending);

const playlistName = (playlistId: string) => names.get(playlistId) ?? t('playlist.yours');

onDownloadsPolled(async () => {
    if (!pending) return;
    try {
        const { additions } = await nvsRequest<{ additions: Addition[] }>('/playlist-additions');
        const added = new Map<string, number>();
        for (const addition of additions) {
            const before = seen.get(addition.additionId);
            seen.set(addition.additionId, addition.state);
            if (!before || before === addition.state) continue;
            const title = addition.title ?? '';
            const playlist = playlistName(addition.playlistId);
            if (addition.state === 'ADDED') {
                added.set(addition.playlistId, (added.get(addition.playlistId) ?? 0) + 1);
            } else if (addition.state === 'GAVE_UP') {
                toast.error({
                    message: t(`playlist.gaveUp.${addition.reason ?? 'unknown'}`, {
                        defaultValue: t('playlist.gaveUp.unknown', { playlist, title }),
                        playlist,
                        title,
                    }),
                });
            } else if (addition.state === 'DOWNLOAD_FAILED') {
                toast.error({ message: t('playlist.downloadFailed', { playlist, title }) });
            }
        }
        added.forEach((count, playlistId) =>
            toast.success({
                message: t('playlist.added', { count, playlist: playlistName(playlistId) }),
            }),
        );
        if (added.size > 0) {
            const serverId = useAuthStore.getState().currentServer?.id;
            if (serverId)
                queryClient.invalidateQueries({ queryKey: queryKeys.playlists.root(serverId) });
        }
        pending = additions.some(
            (addition) => seen.has(addition.additionId) && !SETTLED.includes(addition.state),
        );
    } catch {
        pending = false;
    }
});

/** S4: once each song is downloaded, the server adds it to the playlist (also with Feishin closed). */
export const addToPlaylistLater = async (body: {
    items: { downloadId: string; youtubeId: string }[];
    playlistId: string;
    playlistName: string;
    server: 'JELLYFIN' | 'NAVIDROME';
    userId: null | string;
}) => {
    names.set(body.playlistId, body.playlistName);
    const { additions } = await nvsRequest<{ additions: Addition[] }>('/playlist-additions', {
        body: {
            items: body.items,
            playlistId: body.playlistId,
            server: body.server,
            userId: body.userId,
        },
        method: 'POST',
    });
    additions.forEach((addition) => seen.set(addition.additionId, addition.state));
    pending = true;
    pollDownloads();
    return additions;
};
