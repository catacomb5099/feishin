import { useQuery } from '@tanstack/react-query';
import { Fragment, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import { NativeScrollArea } from '/@/renderer/components/native-scroll-area/native-scroll-area';
import headerStyles from '/@/renderer/features/albums/components/album-detail-header.module.css';
import { JoinedArtists } from '/@/renderer/features/albums/components/joined-artists';
import {
    fromNvsId,
    toAlbum,
    toPlaylist,
    toRelatedArtists,
    toSong,
} from '/@/renderer/features/naviseerr/api/map';
import { naviseerrQueries } from '/@/renderer/features/naviseerr/api/naviseerr-api';
import { NvsCollection } from '/@/renderer/features/naviseerr/api/types';
import { RemoteMenu } from '/@/renderer/features/naviseerr/components/remote-context-menu';
import { RemoteEmptyState } from '/@/renderer/features/naviseerr/components/remote-empty-state';
import {
    RemoteHeaderBar,
    RemoteHeaderMenu,
    useCollectionAction,
} from '/@/renderer/features/naviseerr/components/remote-header';
import {
    ALBUM_COLUMNS,
    PLAYLIST_COLUMNS,
    RemoteSongTable,
} from '/@/renderer/features/naviseerr/components/remote-song-table';
import { useNaviseerrAddress } from '/@/renderer/features/naviseerr/store/naviseerr-store';
import { AnimatedPage } from '/@/renderer/features/shared/components/animated-page';
import { LibraryBackgroundOverlay } from '/@/renderer/features/shared/components/library-background-overlay';
import { LibraryContainer } from '/@/renderer/features/shared/components/library-container';
import { LibraryHeader } from '/@/renderer/features/shared/components/library-header';
import { useFastAverageColor } from '/@/renderer/hooks';
import { AppRoute } from '/@/renderer/router/routes';
import { formatDurationString } from '/@/renderer/utils';
import { Group } from '/@/shared/components/group/group';
import { Separator } from '/@/shared/components/separator/separator';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';
import { LibraryItem } from '/@/shared/types/domain-types';

const BG_FALLBACK = 'var(--theme-colors-foreground-muted)';

type CollectionType = 'ALBUM' | 'PLAYLIST';

const RemoteCollectionPage = ({
    collection,
    nvsId,
    type,
}: {
    collection: NvsCollection;
    nvsId: string;
    type: CollectionType;
}) => {
    const { t } = useTranslation();
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);
    const isAlbum = type === 'ALBUM';

    const songs = useMemo(
        () =>
            collection.tracks.map((track, index) =>
                toSong(
                    {
                        ...track,
                        album: isAlbum ? collection.name : null,
                        albumId: isAlbum ? collection.id : '',
                        iconURL: track.iconURL || collection.iconURL,
                        year: collection.year ?? 0,
                    },
                    index,
                ),
            ),
        [collection, isAlbum],
    );

    const action = {
        ...useCollectionAction({ id: collection.id, songs, type }),
        onMore: (event: React.MouseEvent<HTMLButtonElement>) =>
            RemoteMenu.call({
                cmd: isAlbum
                    ? { items: [toAlbum(collection)], type: LibraryItem.ALBUM }
                    : { items: [toPlaylist(collection)], type: LibraryItem.PLAYLIST },
                event,
            }),
    };

    const { background } = useFastAverageColor({
        id: nvsId,
        src: collection.iconURL,
        srcLoaded: true,
    });

    const seconds = collection.tracks.reduce((sum, track) => sum + (track.durationSeconds ?? 0), 0);

    const metadata = [
        isAlbum && collection.year ? String(collection.year) : null,
        t('entity.trackWithCount', { count: collection.trackCount }),
        seconds ? formatDurationString(seconds * 1000) : null,
        collection.views,
    ].filter(Boolean);

    return (
        <AnimatedPage key={`naviseerr-${nvsId}`}>
            <NativeScrollArea
                pageHeaderProps={{
                    backgroundColor: background ?? BG_FALLBACK,
                    children: <RemoteHeaderBar action={action} title={collection.name} />,
                    offset: 200,
                    target: headerRef,
                }}
                ref={scrollAreaRef}
            >
                <LibraryBackgroundOverlay
                    backgroundColor={background ?? BG_FALLBACK}
                    headerRef={headerRef}
                />
                <LibraryContainer>
                    <Stack ref={headerRef}>
                        <LibraryHeader
                            imageUrl={collection.iconURL}
                            item={{
                                imageUrl: collection.iconURL,
                                route: isAlbum ? AppRoute.LIBRARY_ALBUMS : AppRoute.PLAYLISTS,
                                type: isAlbum ? LibraryItem.ALBUM : LibraryItem.PLAYLIST,
                            }}
                            title={collection.name}
                        >
                            <Stack gap="md" w="100%">
                                <Group className={headerStyles.metadataGroup} gap="xs">
                                    {metadata.map((value, index) => (
                                        <Fragment key={index}>
                                            {index === 0 && <Text isNoSelect>♫ </Text>}
                                            {index > 0 && (
                                                <Text isMuted isNoSelect>
                                                    <Separator />
                                                </Text>
                                            )}
                                            <Text fw={400}>{value}</Text>
                                        </Fragment>
                                    ))}
                                </Group>
                                <Group className={headerStyles.metadataGroup}>
                                    {isAlbum ? (
                                        <JoinedArtists
                                            artistName={collection.artists.join(', ')}
                                            artists={toRelatedArtists(
                                                collection.artists,
                                                collection.artistIds,
                                            )}
                                        />
                                    ) : (
                                        <Text isMuted>{collection.artists.join(', ')}</Text>
                                    )}
                                </Group>
                                <RemoteHeaderMenu action={action} />
                            </Stack>
                        </LibraryHeader>
                    </Stack>
                    <RemoteSongTable
                        columns={isAlbum ? ALBUM_COLUMNS : PLAYLIST_COLUMNS}
                        songs={songs}
                    />
                </LibraryContainer>
            </NativeScrollArea>
            <RemoteMenu.Root />
        </AnimatedPage>
    );
};

const RemoteCollectionRoute = ({ type }: { type: CollectionType }) => {
    const params = useParams();
    const nvsId = (type === 'ALBUM' ? params.albumId : params.playlistId) as string;
    const address = useNaviseerrAddress();
    const query = useQuery(naviseerrQueries.collection(address, fromNvsId(nvsId), type));

    if (!query.data) return <RemoteEmptyState error={query.error} loading={query.isLoading} />;

    return <RemoteCollectionPage collection={query.data} nvsId={nvsId} type={type} />;
};

export const RemoteAlbumRoute = () => <RemoteCollectionRoute type="ALBUM" />;
export const RemotePlaylistRoute = () => <RemoteCollectionRoute type="PLAYLIST" />;
