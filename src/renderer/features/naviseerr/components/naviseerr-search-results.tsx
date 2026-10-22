import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { generatePath, Link, useParams, useSearchParams } from 'react-router';

import { NativeScrollArea } from '/@/renderer/components/native-scroll-area/native-scroll-area';
import { toAlbum, toAlbumArtist, toPlaylist, toSong } from '/@/renderer/features/naviseerr/api/map';
import { naviseerrQueries } from '/@/renderer/features/naviseerr/api/naviseerr-api';
import { NAVISEERR_SEARCH_TAB } from '/@/renderer/features/naviseerr/components/naviseerr-search-section';
import { RemoteMenu } from '/@/renderer/features/naviseerr/components/remote-context-menu';
import { RemoteEmptyState } from '/@/renderer/features/naviseerr/components/remote-empty-state';
import {
    RemoteCarousel,
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
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';
import { LibraryItem } from '/@/shared/types/domain-types';

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

/** Spotify's "All" layout from Feishin parts: Songs, then Artists, Albums and Playlists shelves. */
export const NaviseerrSearchResults = () => {
    const { t } = useTranslation('naviseerr');
    const { t: tf } = useTranslation();
    const { itemType } = useParams() as { itemType: string };
    const [searchParams] = useSearchParams();
    const query = searchParams.get('query') || '';
    const address = useNaviseerrAddress();
    const active = !!address && itemType === NAVISEERR_SEARCH_TAB;
    const search = useQuery({
        ...naviseerrQueries.search(address, query),
        enabled: active && !!query,
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
    if (!search.data) return <RemoteEmptyState error={search.error} loading={search.isLoading} />;

    return (
        <NativeScrollArea>
            <LibraryContainer>
                <Stack gap="xl" py="md">
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
