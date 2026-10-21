import { useQuery } from '@tanstack/react-query';
import { CSSProperties, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createSearchParams, generatePath, useNavigate } from 'react-router';

import { ItemImage } from '/@/renderer/components/item-image/item-image';
import { toNvsId } from '/@/renderer/features/naviseerr/api/map';
import { naviseerrQueries } from '/@/renderer/features/naviseerr/api/naviseerr-api';
import { requestSongDownload } from '/@/renderer/features/naviseerr/hooks/use-downloads';
import { useNaviseerrAddress } from '/@/renderer/features/naviseerr/store/naviseerr-store';
import { CollapsibleCommandGroup } from '/@/renderer/features/search/components/collapsible-command-group';
import { CommandItemSelectable } from '/@/renderer/features/search/components/command-item-selectable';
import styles from '/@/renderer/features/search/components/library-command-item.module.css';
import { AppRoute } from '/@/renderer/router/routes';
import { ActionIcon, ActionIconGroup } from '/@/shared/components/action-icon/action-icon';
import { Box } from '/@/shared/components/box/box';
import { Button } from '/@/shared/components/button/button';
import { Flex } from '/@/shared/components/flex/flex';
import { Spinner } from '/@/shared/components/spinner/spinner';
import { Text } from '/@/shared/components/text/text';
import { toast } from '/@/shared/components/toast/toast';
import { LibraryItem } from '/@/shared/types/domain-types';

export const NAVISEERR_SEARCH_TAB = 'discover';

interface NaviseerrSearchSectionProps {
    debouncedQuery: string;
    expanded: boolean;
    isHome: boolean;
    onSelectResult: () => void;
    onToggle: () => void;
    query: string;
}

interface Row {
    image: string;
    itemType: LibraryItem;
    key: string;
    onDownload?: () => void;
    open?: string;
    subtitle: string;
    title: string;
}

const RemoteCommandItem = ({ isHighlighted, row }: { isHighlighted: boolean; row: Row }) => {
    const { t } = useTranslation('naviseerr');
    const [isHovered, setIsHovered] = useState(false);

    return (
        <Flex
            gap="xl"
            justify="space-between"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{ height: '40px', width: '100%' }}
        >
            <div className={styles.itemGrid} style={{ '--item-height': '40px' } as CSSProperties}>
                <div className={styles.imageWrapper}>
                    <ItemImage
                        alt="cover"
                        className={styles.image}
                        height={40}
                        itemType={row.itemType}
                        src={row.image}
                        type="table"
                        width={40}
                    />
                </div>
                <div className={styles.metadataWrapper}>
                    <Text overflow="hidden">{row.title}</Text>
                    <Text isMuted overflow="hidden" size="sm">
                        {row.subtitle}
                    </Text>
                </div>
            </div>
            {row.onDownload && (isHighlighted || isHovered) && (
                <ActionIconGroup className={styles.controls}>
                    <ActionIcon
                        aria-label={t('action.download')}
                        icon="download"
                        onClick={(event) => {
                            event.stopPropagation();
                            event.preventDefault();
                            row.onDownload?.();
                        }}
                        size="xs"
                        tooltip={{ label: t('action.download') }}
                        variant="default"
                    />
                </ActionIconGroup>
            )}
        </Flex>
    );
};

/** "Not in your library": YouTube Music results under Feishin's own palette sections. */
export function NaviseerrSearchSection({
    debouncedQuery,
    expanded,
    isHome,
    onSelectResult,
    onToggle,
    query,
}: NaviseerrSearchSectionProps) {
    const { t } = useTranslation('naviseerr');
    const { t: tf } = useTranslation();
    const navigate = useNavigate();
    const address = useNaviseerrAddress();
    const enabled = isHome && debouncedQuery !== '' && query !== '';
    const search = useQuery({
        ...naviseerrQueries.search(address, debouncedQuery),
        enabled: !!address && enabled,
    });

    const rows = useMemo((): Row[] => {
        const data = search.data;
        if (!data) return [];
        const download = (id: string, title: string) => () =>
            requestSongDownload(id)
                .then(() => toast.info({ message: t('search.downloading', { title }) }))
                .catch(() => {});
        return [
            ...data.tracks.slice(0, 4).map((track) => ({
                image: track.iconURL,
                itemType: LibraryItem.SONG,
                key: `song-${track.id}`,
                onDownload: download(track.id, track.name),
                subtitle: `${tf('entity.song', { count: 1 })} · ${track.artists.join(', ')}`,
                title: track.name,
            })),
            ...data.artists.slice(0, 2).map((artist) => ({
                image: artist.iconUrl,
                itemType: LibraryItem.ALBUM_ARTIST,
                key: `artist-${artist.id}`,
                open: generatePath(AppRoute.LIBRARY_ALBUM_ARTISTS_DETAIL, {
                    albumArtistId: toNvsId(artist.id),
                }),
                subtitle: tf('entity.artist', { count: 1 }),
                title: artist.name,
            })),
            ...data.albums.slice(0, 2).map((album) => ({
                image: album.iconURL,
                itemType: LibraryItem.ALBUM,
                key: `album-${album.id}`,
                open: generatePath(AppRoute.LIBRARY_ALBUMS_DETAIL, { albumId: toNvsId(album.id) }),
                subtitle: `${tf('entity.album', { count: 1 })} · ${album.artists.join(', ')}`,
                title: album.name,
            })),
            ...data.playlists.slice(0, 2).map((playlist) => ({
                image: playlist.iconURL,
                itemType: LibraryItem.PLAYLIST,
                key: `playlist-${playlist.id}`,
                open: generatePath(AppRoute.PLAYLISTS_DETAIL_SONGS, {
                    playlistId: toNvsId(playlist.id),
                }),
                subtitle: `${tf('entity.playlist', { count: 1 })} · ${playlist.artists.join(', ')}`,
                title: playlist.name,
            })),
        ];
    }, [search.data, t, tf]);

    if (!address || !isHome || !query) return null;

    const showAll = () => {
        navigate({
            pathname: generatePath(AppRoute.SEARCH, { itemType: NAVISEERR_SEARCH_TAB }),
            search: createSearchParams({ query: debouncedQuery || query }).toString(),
        });
        onSelectResult();
    };

    return (
        <CollapsibleCommandGroup
            expanded={expanded}
            heading={t('search.section')}
            onToggle={onToggle}
            subtitle={
                search.isFetched ? (
                    <Button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            showAll();
                        }}
                        onKeyDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                        }}
                        size="compact-xs"
                        variant="filled"
                        w="8rem"
                    >
                        {t('search.showAll')}
                    </Button>
                ) : undefined
            }
        >
            {search.isLoading ? (
                <Box p="md">
                    <Spinner container />
                </Box>
            ) : search.error ? (
                <Box p="md">
                    <Text isMuted size="sm">
                        {search.error.message}
                    </Text>
                </Box>
            ) : (
                rows.map((row) => (
                    <CommandItemSelectable
                        key={row.key}
                        onSelect={() => {
                            if (row.open) {
                                navigate(row.open);
                                onSelectResult();
                            } else {
                                row.onDownload?.();
                            }
                        }}
                        value={`naviseerr-${row.key}`}
                    >
                        {({ isHighlighted }) => (
                            <RemoteCommandItem isHighlighted={isHighlighted} row={row} />
                        )}
                    </CommandItemSelectable>
                ))
            )}
        </CollapsibleCommandGroup>
    );
}
