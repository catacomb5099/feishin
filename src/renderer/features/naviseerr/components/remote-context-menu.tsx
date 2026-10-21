import { useQuery } from '@tanstack/react-query';
import Fuse from 'fuse.js';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createCallable } from 'react-call';
import { useTranslation } from 'react-i18next';
import { generatePath, useNavigate } from 'react-router';

import { api } from '/@/renderer/api';
import { queryKeys } from '/@/renderer/api/query-keys';
import { GoToAction } from '/@/renderer/features/context-menu/actions/go-to-action';
import {
    fromNvsId,
    RADIO_PREFIX,
    RemoteSong,
    toNvsId,
} from '/@/renderer/features/naviseerr/api/map';
import { naviseerrQueries, startRadio } from '/@/renderer/features/naviseerr/api/naviseerr-api';
import { openSongInfo } from '/@/renderer/features/naviseerr/components/song-info-modal';
import {
    requestCollectionDownload,
    requestSongDownload,
} from '/@/renderer/features/naviseerr/hooks/use-downloads';
import {
    useMediaServer,
    usePlayFromLibrary,
} from '/@/renderer/features/naviseerr/hooks/use-library-state';
import { addToPlaylistLater } from '/@/renderer/features/naviseerr/hooks/use-playlist-additions';
import { getNaviseerrAddress } from '/@/renderer/features/naviseerr/store/naviseerr-store';
import { playlistsQueries } from '/@/renderer/features/playlists/api/playlists-api';
import { useRecentPlaylists } from '/@/renderer/features/playlists/hooks/use-recent-playlists';
import { queryClient } from '/@/renderer/lib/react-query';
import { AppRoute } from '/@/renderer/router/routes';
import { useCurrentServer } from '/@/renderer/store';
import { ContextMenu } from '/@/shared/components/context-menu/context-menu';
import { Icon } from '/@/shared/components/icon/icon';
import { Spinner } from '/@/shared/components/spinner/spinner';
import { TextInput } from '/@/shared/components/text-input/text-input';
import { toast } from '/@/shared/components/toast/toast';
import {
    Album,
    LibraryItem,
    Playlist,
    PlaylistListSort,
    SortOrder,
} from '/@/shared/types/domain-types';

export type RemoteMenuCommand =
    | { inLibrary?: boolean; items: RemoteSong[]; type: LibraryItem.SONG }
    | { items: Album[]; type: LibraryItem.ALBUM }
    | { items: Playlist[]; type: LibraryItem.PLAYLIST };

type Items = { downloadId: string; youtubeId: string }[];

/** Ask for the downloads; the songs in the order they go into a playlist, each with its download. */
const downloadForPlaylist = async (cmd: RemoteMenuCommand): Promise<Items> => {
    const items: Items = [];
    if (cmd.type === LibraryItem.SONG) {
        for (const song of cmd.items) {
            const download = await requestSongDownload(song._nvs.youtubeId, true);
            items.push({ downloadId: download.downloadId, youtubeId: song._nvs.youtubeId });
        }
        return items;
    }
    const id = fromNvsId(cmd.items[0].id);
    const type = cmd.type === LibraryItem.ALBUM ? 'ALBUM' : 'PLAYLIST';
    const collection = await queryClient.fetchQuery(
        naviseerrQueries.collection(getNaviseerrAddress(), id, type),
    );
    if (type === 'ALBUM') {
        const download = await requestCollectionDownload(id, 'ALBUM');
        return collection.tracks.map((track) => ({
            downloadId: download.downloadId,
            youtubeId: track.id,
        }));
    }
    // A YouTube playlist goes in as one download per song, so no read-only copy of it appears.
    for (const track of collection.tracks) {
        const download = await requestSongDownload(track.id, true);
        items.push({ downloadId: download.downloadId, youtubeId: track.id });
    }
    return items;
};

/** Built like Feishin's own Add to playlist: search box, the recent playlist first. */
const RemoteAddToPlaylist = ({ cmd }: { cmd: RemoteMenuCommand }) => {
    const { t } = useTranslation('naviseerr');
    const { t: tf } = useTranslation();
    const server = useCurrentServer();
    const mediaServer = useMediaServer();
    const [searchTerm, setSearchTerm] = useState('');
    const { addRecentPlaylist, recentPlaylistId } = useRecentPlaylists(server?.id ?? null);

    const playlistsQuery = useQuery(
        playlistsQueries.list({
            query: {
                excludeSmartPlaylists: true,
                sortBy: PlaylistListSort.NAME,
                sortOrder: SortOrder.ASC,
                startIndex: 0,
            },
            serverId: server?.id,
        }),
    );

    // Imported (.m3u) and other people's playlists are read-only on both servers.
    const playlists = useMemo(
        () =>
            (playlistsQuery.data?.items ?? []).filter(
                (playlist) =>
                    !playlist.rules && !playlist.sync && playlist.ownerId === server?.userId,
            ),
        [playlistsQuery.data?.items, server?.userId],
    );

    const shown = useMemo(() => {
        const found = searchTerm
            ? new Fuse(playlists, { ignoreLocation: true, keys: ['name'], threshold: 0.3 })
                  .search(searchTerm)
                  .map((result) => result.item)
            : playlists;
        const recent = found.find((playlist) => playlist.id === recentPlaylistId);
        return recent ? [recent, ...found.filter((p) => p !== recent)] : found;
    }, [playlists, recentPlaylistId, searchTerm]);

    if (!mediaServer || !server) return null;

    const title = cmd.items.length === 1 ? cmd.items[0].name : '';
    const name = searchTerm.trim();
    const canCreate = !!name && !playlists.some((p) => p.name.toLowerCase() === name.toLowerCase());

    // Spotify's "New playlist" inside Add to playlist: Feishin's own call on its server, then the same add.
    const handleCreate = async () => {
        try {
            const created = await api.controller.createPlaylist({
                apiClientProps: { serverId: server.id },
                body: { name, public: false },
            });
            if (!created?.id) throw new Error(tf('error.genericError'));
            queryClient.invalidateQueries({ queryKey: queryKeys.playlists.root(server.id) });
            await handleAdd({ id: created.id, name } as Playlist);
        } catch (error) {
            toast.error({ message: (error as Error).message });
        }
    };

    const handleAdd = async (playlist: Playlist) => {
        try {
            const items = await downloadForPlaylist(cmd);
            await addToPlaylistLater({
                items,
                playlistId: playlist.id,
                playlistName: playlist.name,
                server: mediaServer,
                userId: server.userId,
            });
            addRecentPlaylist(playlist.id);
            toast.info({
                message: t(
                    cmd.type === LibraryItem.SONG ? 'playlist.queued' : 'playlist.queuedMany',
                    {
                        playlist: playlist.name,
                        title,
                    },
                ),
            });
        } catch (error) {
            toast.error({ message: (error as Error).message });
        }
    };

    const searchInput = (
        <TextInput
            autoFocus
            leftSection={<Icon icon="search" />}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            pb="xs"
            placeholder={t('playlist.searchOrName')}
            size="sm"
            value={searchTerm}
        />
    );

    return (
        <ContextMenu.Submenu isCloseDisabled>
            <ContextMenu.SubmenuTarget>
                <ContextMenu.Item
                    leftIcon="playlist"
                    onSelect={(e) => e.preventDefault()}
                    rightIcon="arrowRightS"
                >
                    {tf('page.contextMenu.addToPlaylist')}
                </ContextMenu.Item>
            </ContextMenu.SubmenuTarget>
            <ContextMenu.SubmenuContent stickyContent={searchInput}>
                {playlistsQuery.isLoading && (
                    <ContextMenu.Item disabled>
                        <Spinner container />
                    </ContextMenu.Item>
                )}
                {canCreate && (
                    <ContextMenu.Item leftIcon="add" onSelect={handleCreate}>
                        {t('playlist.create', { name })}
                    </ContextMenu.Item>
                )}
                {!playlistsQuery.isLoading && shown.length === 0 && !canCreate && (
                    <ContextMenu.Item disabled>{tf('common.noResultsFromQuery')}</ContextMenu.Item>
                )}
                {shown.map((playlist) => (
                    <ContextMenu.Item key={playlist.id} onSelect={() => handleAdd(playlist)}>
                        {playlist.name}
                    </ContextMenu.Item>
                ))}
            </ContextMenu.SubmenuContent>
        </ContextMenu.Submenu>
    );
};

const RemoteMenuContent = ({ cmd }: { cmd: RemoteMenuCommand }) => {
    const { t } = useTranslation('naviseerr');
    const navigate = useNavigate();

    const openRadio = (song: RemoteSong) => {
        const toastId = toast.info({ message: t('radio.starting', { title: song.name }) });
        startRadio(song._nvs.youtubeId)
            .then((radio) => {
                toast.hide(toastId);
                navigate(
                    generatePath(AppRoute.PLAYLISTS_DETAIL_SONGS, {
                        playlistId: toNvsId(RADIO_PREFIX + radio.id),
                    }),
                );
            })
            .catch((error) => toast.error({ message: (error as Error).message }));
    };
    const play = usePlayFromLibrary();
    const songs = cmd.type === LibraryItem.SONG ? cmd.items : null;

    const download = () => {
        if (songs) {
            songs.forEach((song) => requestSongDownload(song._nvs.youtubeId).catch(() => {}));
        } else {
            const type = cmd.type === LibraryItem.ALBUM ? 'ALBUM' : 'PLAYLIST';
            requestCollectionDownload(fromNvsId(cmd.items[0].id), type).catch(() => {});
        }
    };

    return (
        <ContextMenu.Content>
            {songs && cmd.type === LibraryItem.SONG && cmd.inLibrary && play ? (
                <ContextMenu.Item
                    leftIcon="mediaPlay"
                    onSelect={() => play(songs.map((song) => song._nvs.youtubeId))}
                >
                    {t('action.play')}
                </ContextMenu.Item>
            ) : (
                <ContextMenu.Item leftIcon="download" onSelect={download}>
                    {t('action.download')}
                </ContextMenu.Item>
            )}
            <RemoteAddToPlaylist cmd={cmd} />
            {songs?.length === 1 && (
                <ContextMenu.Item leftIcon="radio" onSelect={() => openRadio(songs[0])}>
                    {t('radio.start')}
                </ContextMenu.Item>
            )}
            {songs?.length === 1 && (
                <ContextMenu.Item
                    leftIcon="info"
                    onSelect={() => openSongInfo(songs[0]._nvs.youtubeId, songs[0].name)}
                >
                    {t('songInfo.heading')}
                </ContextMenu.Item>
            )}
            {cmd.type !== LibraryItem.PLAYLIST && (
                <>
                    <ContextMenu.Divider />
                    <GoToAction items={cmd.items} />
                </>
            )}
        </ContextMenu.Content>
    );
};

/** The module's own context menu (Feishin's would offer library actions); mount Root once per page. */
export const RemoteMenu = createCallable<
    { cmd: RemoteMenuCommand; event: React.MouseEvent<unknown> },
    void
>(({ cmd, event }) => {
    const triggerRef = useRef<HTMLDivElement>(null);
    const isExecuted = useRef(false);

    useEffect(() => {
        if (isExecuted.current || !triggerRef.current) return;
        isExecuted.current = true;
        event.preventDefault();
        triggerRef.current.dispatchEvent(
            new MouseEvent('contextmenu', {
                bubbles: true,
                clientX: event.clientX,
                clientY: event.clientY,
            }),
        );
    }, [event]);

    return (
        <ContextMenu>
            <ContextMenu.Target>
                <div
                    ref={triggerRef}
                    style={{
                        height: 0,
                        left: 0,
                        pointerEvents: 'none',
                        position: 'absolute',
                        top: 0,
                        width: 0,
                    }}
                />
            </ContextMenu.Target>
            <RemoteMenuContent cmd={cmd} />
        </ContextMenu>
    );
});
