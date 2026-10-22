import { useQuery } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import { NativeScrollArea } from '/@/renderer/components/native-scroll-area/native-scroll-area';
import headerStyles from '/@/renderer/features/albums/components/album-detail-header.module.css';
import { fromNvsId, toAlbum, toSong } from '/@/renderer/features/naviseerr/api/map';
import { naviseerrQueries } from '/@/renderer/features/naviseerr/api/naviseerr-api';
import { NvsArtistPage } from '/@/renderer/features/naviseerr/api/types';
import { RemoteMenu } from '/@/renderer/features/naviseerr/components/remote-context-menu';
import { RemoteEmptyState } from '/@/renderer/features/naviseerr/components/remote-empty-state';
import {
    RemoteCarousel,
    RemoteSectionTitle,
} from '/@/renderer/features/naviseerr/components/remote-section';
import {
    ARTIST_COLUMNS,
    RemoteSongTable,
} from '/@/renderer/features/naviseerr/components/remote-song-table';
import { useNaviseerrAddress } from '/@/renderer/features/naviseerr/store/naviseerr-store';
import { AnimatedPage } from '/@/renderer/features/shared/components/animated-page';
import { LibraryBackgroundOverlay } from '/@/renderer/features/shared/components/library-background-overlay';
import { LibraryContainer } from '/@/renderer/features/shared/components/library-container';
import { LibraryHeader } from '/@/renderer/features/shared/components/library-header';
import { LibraryHeaderBar } from '/@/renderer/features/shared/components/library-header-bar';
import { useFastAverageColor } from '/@/renderer/hooks';
import { AppRoute } from '/@/renderer/router/routes';
import { Button } from '/@/shared/components/button/button';
import { Group } from '/@/shared/components/group/group';
import { Spoiler } from '/@/shared/components/spoiler/spoiler';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';
import { LibraryItem } from '/@/shared/types/domain-types';

const BG_FALLBACK = 'var(--theme-colors-foreground-muted)';

// Spotify's artist page: Popular shows 5, "See more" shows 10.
const POPULAR_FEW = 5;
const POPULAR_MANY = 10;

const RemoteArtistPage = ({ artist, nvsId }: { artist: NvsArtistPage; nvsId: string }) => {
    const { t } = useTranslation('naviseerr');
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);
    const [expanded, setExpanded] = useState(false);

    const topSongs = useMemo(
        () =>
            artist.topSongs.map((track, index) =>
                toSong({ ...track, durationSeconds: track.durationSeconds ?? null }, index),
            ),
        [artist.topSongs],
    );
    const shown = useMemo(
        () => topSongs.slice(0, expanded ? POPULAR_MANY : POPULAR_FEW),
        [expanded, topSongs],
    );
    const albums = useMemo(() => artist.albums.map(toAlbum), [artist.albums]);
    const singles = useMemo(() => artist.singles.map(toAlbum), [artist.singles]);

    const { background } = useFastAverageColor({
        id: nvsId,
        src: artist.iconURL,
        srcLoaded: true,
    });

    return (
        <AnimatedPage key={`naviseerr-${nvsId}`}>
            <NativeScrollArea
                pageHeaderProps={{
                    backgroundColor: background ?? BG_FALLBACK,
                    children: (
                        <LibraryHeaderBar>
                            <LibraryHeaderBar.Title>{artist.name}</LibraryHeaderBar.Title>
                        </LibraryHeaderBar>
                    ),
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
                            imageUrl={artist.iconURL}
                            item={{
                                imageUrl: artist.iconURL,
                                route: AppRoute.LIBRARY_ALBUM_ARTISTS,
                                type: LibraryItem.ALBUM_ARTIST,
                            }}
                            title={artist.name}
                        >
                            {artist.subscribers && (
                                <Group className={headerStyles.metadataGroup}>
                                    <Text fw={400}>
                                        {t('artist.subscribers', { count: artist.subscribers })}
                                    </Text>
                                </Group>
                            )}
                        </LibraryHeader>
                    </Stack>
                    <Stack gap="xl" mt="lg">
                        {topSongs.length > 0 && (
                            <section>
                                <RemoteSectionTitle
                                    extra={
                                        topSongs.length > POPULAR_FEW && (
                                            <Button
                                                onClick={() => setExpanded((value) => !value)}
                                                size="compact-md"
                                                uppercase
                                                variant="subtle"
                                            >
                                                {expanded
                                                    ? t('artist.showLess')
                                                    : t('artist.seeMore')}
                                            </Button>
                                        )
                                    }
                                >
                                    {t('artist.popular')}
                                </RemoteSectionTitle>
                                <RemoteSongTable columns={ARTIST_COLUMNS} songs={shown} />
                            </section>
                        )}
                        <RemoteCarousel
                            data={albums}
                            itemType={LibraryItem.ALBUM}
                            title={t('artist.albums')}
                        />
                        <RemoteCarousel
                            data={singles}
                            itemType={LibraryItem.ALBUM}
                            title={t('artist.singles')}
                        />
                        {artist.description && (
                            <section>
                                <RemoteSectionTitle>{t('artist.about')}</RemoteSectionTitle>
                                <Spoiler maxHeight={80}>
                                    <Text isMuted>{artist.description}</Text>
                                </Spoiler>
                            </section>
                        )}
                    </Stack>
                </LibraryContainer>
            </NativeScrollArea>
            <RemoteMenu.Root />
        </AnimatedPage>
    );
};

export const RemoteArtistRoute = () => {
    const params = useParams();
    const nvsId = (params.albumArtistId ?? params.artistId) as string;
    const address = useNaviseerrAddress();
    const query = useQuery(naviseerrQueries.artist(address, fromNvsId(nvsId)));

    if (!query.data) return <RemoteEmptyState error={query.error} loading={query.isLoading} />;

    return <RemoteArtistPage artist={query.data} nvsId={nvsId} />;
};
