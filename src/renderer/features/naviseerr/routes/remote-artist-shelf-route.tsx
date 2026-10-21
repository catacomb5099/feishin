import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import { useGridRows } from '/@/renderer/components/item-list/helpers/use-grid-rows';
import { ItemGridList } from '/@/renderer/components/item-list/item-grid-list/item-grid-list';
import { PageHeader } from '/@/renderer/components/page-header/page-header';
import { toAlbum, toPlaylist } from '/@/renderer/features/naviseerr/api/map';
import { naviseerrQueries } from '/@/renderer/features/naviseerr/api/naviseerr-api';
import { RemoteMenu } from '/@/renderer/features/naviseerr/components/remote-context-menu';
import { RemoteEmptyState } from '/@/renderer/features/naviseerr/components/remote-empty-state';
import { ArtistShelf } from '/@/renderer/features/naviseerr/routes/remote-artist-route';
import { useNaviseerrAddress } from '/@/renderer/features/naviseerr/store/naviseerr-store';
import { AnimatedPage } from '/@/renderer/features/shared/components/animated-page';
import { LibraryHeaderBar } from '/@/renderer/features/shared/components/library-header-bar';
import { Album, LibraryItem, Playlist } from '/@/shared/types/domain-types';
import { ItemListKey } from '/@/shared/types/types';

/** Every album, single or playlist of an artist you don't have, in Feishin's grid. */
export const RemoteArtistShelfRoute = () => {
    const { t } = useTranslation('naviseerr');
    const { artistId, shelf } = useParams() as { artistId: string; shelf: ArtistShelf };
    const address = useNaviseerrAddress();
    const query = useQuery(naviseerrQueries.artist(address, artistId));
    const isPlaylists = shelf === 'playlists';
    const itemType = isPlaylists ? LibraryItem.PLAYLIST : LibraryItem.ALBUM;
    const rows = useGridRows(itemType, isPlaylists ? ItemListKey.PLAYLIST : ItemListKey.ALBUM);

    const items = useMemo(() => {
        const artist = query.data;
        if (!artist) return [];
        if (isPlaylists) return artist.playlists.map(toPlaylist);
        return (shelf === 'singles' ? artist.singles : artist.albums).map(toAlbum);
    }, [isPlaylists, query.data, shelf]);

    const overrideControls = useMemo(
        () => ({
            onMore: ({ event, item }: { event: null | React.MouseEvent<unknown>; item: unknown }) =>
                event &&
                item &&
                RemoteMenu.call({
                    cmd: isPlaylists
                        ? { items: [item as Playlist], type: LibraryItem.PLAYLIST }
                        : { items: [item as Album], type: LibraryItem.ALBUM },
                    event,
                }),
            onPlay: undefined,
        }),
        [isPlaylists],
    );

    if (!query.data) return <RemoteEmptyState error={query.error} loading={query.isLoading} />;

    const shelfName = {
        albums: t('artist.albums'),
        playlists: t('artist.featuring', { name: query.data.name }),
        singles: t('artist.singles'),
    }[shelf];

    return (
        <AnimatedPage>
            <PageHeader>
                <LibraryHeaderBar ignoreMaxWidth>
                    <LibraryHeaderBar.Title>
                        {isPlaylists
                            ? shelfName
                            : t('artist.shelfTitle', { name: query.data.name, shelf: shelfName })}
                    </LibraryHeaderBar.Title>
                    <LibraryHeaderBar.Badge>{items.length}</LibraryHeaderBar.Badge>
                </LibraryHeaderBar>
            </PageHeader>
            <ItemGridList
                data={items}
                enableDrag={false}
                enableSelection={false}
                itemType={itemType}
                overrideControls={overrideControls}
                rows={rows}
            />
            <RemoteMenu.Root />
        </AnimatedPage>
    );
};
