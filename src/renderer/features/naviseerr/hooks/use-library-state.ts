import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { api } from '/@/renderer/api';
import { naviseerrQueries } from '/@/renderer/features/naviseerr/api/naviseerr-api';
import { nvsRequest, segment } from '/@/renderer/features/naviseerr/api/naviseerr-client';
import { useNaviseerrAddress } from '/@/renderer/features/naviseerr/store/naviseerr-store';
import { usePlayer } from '/@/renderer/features/player/context/player-context';
import { useCurrentServer } from '/@/renderer/store';
import { toast } from '/@/shared/components/toast/toast';
import { ServerType, Song } from '/@/shared/types/domain-types';
import { Play } from '/@/shared/types/types';

type MediaItem = { albumId?: string; id?: string; reason?: string };

const SERVER_NAMES: Partial<Record<ServerType, 'JELLYFIN' | 'NAVIDROME'>> = {
    [ServerType.JELLYFIN]: 'JELLYFIN',
    [ServerType.NAVIDROME]: 'NAVIDROME',
};

/** The media server naviseerr files into, when it is the same kind Feishin plays from; else null. */
export const useMediaServer = () => {
    const address = useNaviseerrAddress();
    const server = useCurrentServer();
    const status = useQuery(naviseerrQueries.status(address)).data;
    const name = server ? SERVER_NAMES[server.type] : undefined;
    const filesThere = status?.library.enabled
        ? status.library.mediaServers.some((media) => media.name.toUpperCase() === name)
        : false;
    return name && filesThere ? name : null;
};

/** S3: the library copy of each downloaded song, in the order asked; at most 50 per call. */
export const findInMediaServer = async (server: 'JELLYFIN' | 'NAVIDROME', ids: string[]) => {
    const answer: Record<string, MediaItem> = {};
    for (let i = 0; i < ids.length; i += 50) {
        const chunk = ids
            .slice(i, i + 50)
            .map(segment)
            .join(',');
        Object.assign(
            answer,
            await nvsRequest<Record<string, MediaItem>>(
                `/library/media-items?server=${server}&ids=${chunk}`,
            ),
        );
    }
    return ids.map((id) => answer[id] ?? { reason: 'NOT_IN_LIBRARY' });
};

/** Play songs you downloaded with Feishin's own player, found by their YouTube ids. */
export const usePlayFromLibrary = () => {
    const { t } = useTranslation('naviseerr');
    const mediaServer = useMediaServer();
    const server = useCurrentServer();
    const { addToQueueByData } = usePlayer();

    const play = useCallback(
        async (youtubeIds: string[], playType: Play = Play.NOW) => {
            if (!mediaServer || !server) return;
            try {
                const found = await findInMediaServer(mediaServer, youtubeIds);
                const ids = found.map((item) => item.id).filter((id): id is string => !!id);
                if (ids.length === 0) {
                    toast.error({ message: t(`play.${found[0]?.reason ?? 'NOT_IN_LIBRARY'}`) });
                    return;
                }
                const songs = await Promise.all(
                    ids.map((id) =>
                        api.controller.getSongDetail({
                            apiClientProps: { serverId: server.id },
                            query: { id },
                        }),
                    ),
                );
                addToQueueByData(songs.filter(Boolean) as Song[], playType);
            } catch (error) {
                toast.error({ message: (error as Error).message });
            }
        },
        [addToQueueByData, mediaServer, server, t],
    );

    return mediaServer ? play : null;
};

/** The Feishin album a downloaded song landed in, for "Go to album". */
export const findLibraryAlbum = async (server: 'JELLYFIN' | 'NAVIDROME', youtubeId: string) =>
    (await findInMediaServer(server, [youtubeId]))[0]?.albumId ?? null;
