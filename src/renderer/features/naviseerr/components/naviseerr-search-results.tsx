import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { generatePath, Link, useParams, useSearchParams } from 'react-router';

import { NativeScrollArea } from '/@/renderer/components/native-scroll-area/native-scroll-area';
import {
    RemoteSong,
    toAlbum,
    toAlbumArtist,
    toPlaylist,
    toSong,
} from '/@/renderer/features/naviseerr/api/map';
import { naviseerrQueries } from '/@/renderer/features/naviseerr/api/naviseerr-api';
import { NAVISEERR_SEARCH_TAB } from '/@/renderer/features/naviseerr/components/naviseerr-search-section';
import { RemoteMenu } from '/@/renderer/features/naviseerr/components/remote-context-menu';
import { RemoteEmptyState } from '/@/renderer/features/naviseerr/components/remote-empty-state';
import {
    RemoteCarousel,
    RemoteGrid,
    RemoteSectionTitle,
} from '/@/renderer/features/naviseerr/components/remote-section';
import {
    RemoteSongTable,
    SEARCH_COLUMNS,
} from '/@/renderer/features/naviseerr/components/remote-song-table';
import { useNaviseerrAddress } from '/@/renderer/features/naviseerr/store/naviseerr-store';
import { LibraryContainer } from '/@/renderer/features/shared/components/library-container';
import { AppRoute } from '/@/renderer/router/routes';
import { Button } from '/@/shared/components/button/button';
import { Group } from '/@/shared/components/group/group';
import { SegmentedControl } from '/@/shared/components/segmented-control/segmented-control';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';
import { Album, AlbumArtist, LibraryItem, Playlist } from '/@/shared/types/domain-types';

/** The search page's Discover tab button, next to Tracks / Albums / Artists. */
export const NaviseerrSearchTab = ({ navigationId }: { navigationId: string }) => {
    const { t } = useTranslation('naviseerr');
    const { itemType } = useParams() as { itemType: string };
    const [searchParams] = useSearchParams();
    const address = useNaviseerrAddress();

    if (!address) return null;

    return (
        <Button
            component={Link}
            fw={600}
            replace
            size="compact-md"
            state={{ navigationId }}
            to={{
                pathname: generatePath(AppRoute.SEARCH, { itemType: NAVISEERR_SEARCH_TAB }),
                search: searchParams.toString(),
            }}
            variant={itemType === NAVISEERR_SEARCH_TAB ? 'filled' : 'default'}
        >
            {t('search.tab')}
        </Button>
    );
};

const SEARCH_KINDS = ['tracks', 'artists', 'albums', 'playlists'] as const;
type SearchKind = (typeof SEARCH_KINDS)[number];

// Spotify's chips page through 20 at a time; the server answers at most 100.
const PAGE = 20;
const MAX = 100;

/** One kind only (Spotify's Songs / Artists / Albums / Playlists chips), with Show more. */
const TypedResults = ({ kind, query }: { kind: SearchKind; query: string }) => {
    const { t } = useTranslation('naviseerr');
    const address = useNaviseerrAddress();
    const [limit, setLimit] = useState(PAGE);
    const search = useQuery({
        ...naviseerrQueries.searchKind(address, query, kind, limit),
        placeholderData: keepPreviousData,
    });
    const data = search.data;

    const list = useMemo(() => {
        if (!data) return null;
        if (kind === 'tracks') return data.tracks.map((track, index) => toSong(track, index));
        if (kind === 'artists') return data.artists.map(toAlbumArtist);
        if (kind === 'albums') return data.albums.map(toAlbum);
        return data.playlists.map(toPlaylist);
    }, [data, kind]);

    if (!list) return <RemoteEmptyState error={search.error} loading={search.isLoading} />;

    const itemType = {
        albums: LibraryItem.ALBUM,
        artists: LibraryItem.ALBUM_ARTIST,
        playlists: LibraryItem.PLAYLIST,
    } as const;

    return (
        <Stack gap="md">
            {kind === 'tracks' ? (
                <RemoteSongTable columns={SEARCH_COLUMNS} songs={list as RemoteSong[]} />
            ) : (
                <RemoteGrid
                    data={list as (Album | AlbumArtist | Playlist)[]}
                    itemType={itemType[kind]}
                />
            )}
            {list.length >= limit && limit < MAX && (
                <Group justify="center">
                    <Button
                        loading={search.isFetching}
                        onClick={() => setLimit((value) => Math.min(value + PAGE, MAX))}
                        variant="default"
                    >
                        {t('search.showMore')}
                    </Button>
                </Group>
            )}
        </Stack>
    );
};

/** Spotify's "All" layout from Feishin parts: Songs, then Artists, Albums and Playlists shelves. */
export const NaviseerrSearchResults = () => {
    const { t } = useTranslation('naviseerr');
    const { t: tf } = useTranslation();
    const { itemType } = useParams() as { itemType: string };
    const [searchParams, setSearchParams] = useSearchParams();
    const query = searchParams.get('query') || '';
    const address = useNaviseerrAddress();
    const active = !!address && itemType === NAVISEERR_SEARCH_TAB;
    const kind = (searchParams.get('type') || 'all') as 'all' | SearchKind;
    const search = useQuery({
        ...naviseerrQueries.search(address, query),
        enabled: active && !!query && kind === 'all',
    });

    const results = useMemo(() => {
        const data = search.data;
        return {
            albums: data?.albums.map(toAlbum) ?? [],
            artists: data?.artists.map(toAlbumArtist) ?? [],
            playlists: data?.playlists.map(toPlaylist) ?? [],
            songs: data?.tracks.map((track, index) => toSong(track, index)) ?? [],
        };
    }, [search.data]);

    if (!active) return null;
    if (!query) {
        return (
            <Text isMuted p="xl" ta="center">
                {t('search.empty')}
            </Text>
        );
    }
    const chips = (
        <SegmentedControl
            data={(['all', ...SEARCH_KINDS] as const).map((value) => ({
                label: t(`search.kind.${value}`),
                value,
            }))}
            onChange={(value) => {
                const next = new URLSearchParams(searchParams);
                if (value === 'all') next.delete('type');
                else next.set('type', value);
                setSearchParams(next, { replace: true });
            }}
            value={kind}
        />
    );

    if (kind !== 'all') {
        return (
            <NativeScrollArea>
                <LibraryContainer>
                    <Stack gap="xl" py="md">
                        <Group>{chips}</Group>
                        <TypedResults key={`${kind}-${query}`} kind={kind} query={query} />
                    </Stack>
                </LibraryContainer>
                <RemoteMenu.Root />
            </NativeScrollArea>
        );
    }

    if (!search.data) return <RemoteEmptyState error={search.error} loading={search.isLoading} />;

    return (
        <NativeScrollArea>
            <LibraryContainer>
                <Stack gap="xl" py="md">
                    <Group>{chips}</Group>
                    {results.songs.length > 0 && (
                        <section>
                            <RemoteSectionTitle>
                                {tf('entity.song', { count: 2 })}
                            </RemoteSectionTitle>
                            <RemoteSongTable columns={SEARCH_COLUMNS} songs={results.songs} />
                        </section>
                    )}
                    <RemoteCarousel
                        data={results.artists}
                        itemType={LibraryItem.ALBUM_ARTIST}
                        title={tf('entity.artist', { count: 2 })}
                    />
                    <RemoteCarousel
                        data={results.albums}
                        itemType={LibraryItem.ALBUM}
                        title={tf('entity.album', { count: 2 })}
                    />
                    <RemoteCarousel
                        data={results.playlists}
                        itemType={LibraryItem.PLAYLIST}
                        title={tf('entity.playlist', { count: 2 })}
                    />
                </Stack>
            </LibraryContainer>
            <RemoteMenu.Root />
        </NativeScrollArea>
    );
};
