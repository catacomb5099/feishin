import { ReactNode, useMemo } from 'react';

import {
    GridCarousel,
    useGridCarouselContainerQuery,
} from '/@/renderer/components/grid-carousel/grid-carousel-v2';
import { MemoizedItemCard } from '/@/renderer/components/item-card/item-card';
import { useGridRows } from '/@/renderer/components/item-list/helpers/use-grid-rows';
import { ItemControls } from '/@/renderer/components/item-list/types';
import styles from '/@/renderer/features/artists/components/album-artist-detail-content.module.css';
import { RemoteMenu } from '/@/renderer/features/naviseerr/components/remote-context-menu';
import { Group } from '/@/shared/components/group/group';
import { TextTitle } from '/@/shared/components/text-title/text-title';
import { Album, AlbumArtist, LibraryItem, Playlist } from '/@/shared/types/domain-types';
import { ItemListKey } from '/@/shared/types/types';

/** Feishin's artist-page section title: the name, a rule, then whatever sits on the right. */
export const RemoteSectionTitle = ({
    children,
    extra,
}: {
    children: ReactNode;
    extra?: ReactNode;
}) => (
    <div className={styles.albumSectionTitle}>
        <Group>
            <TextTitle fw={700} order={3}>
                {children}
            </TextTitle>
        </Group>
        <div className={styles.albumSectionDividerContainer}>
            <div className={styles.albumSectionDivider} />
            {extra}
        </div>
    </div>
);

const LIST_KEYS = {
    [LibraryItem.ALBUM]: ItemListKey.ALBUM,
    [LibraryItem.ALBUM_ARTIST]: ItemListKey.ALBUM_ARTIST,
    [LibraryItem.PLAYLIST]: ItemListKey.PLAYLIST,
} as const;

interface RemoteCarouselProps {
    containerQuery?: ReturnType<typeof useGridCarouselContainerQuery>;
    data: (Album | AlbumArtist | Playlist)[];
    extra?: ReactNode;
    itemType: keyof typeof LIST_KEYS;
    // Home's shelves use Feishin's plain carousel title; detail pages the section title with a rule.
    plainTitle?: boolean;
    title: ReactNode;
}

/** A shelf of Feishin cards for things you don't have: open on click, no Play on hover. */
export const RemoteCarousel = ({
    containerQuery,
    data,
    extra,
    itemType,
    plainTitle,
    title,
}: RemoteCarouselProps) => {
    const rows = useGridRows(itemType, LIST_KEYS[itemType]);
    const controls = useMemo((): ItemControls => {
        if (itemType === LibraryItem.ALBUM_ARTIST) return {};
        return {
            onMore: ({ event, item }) =>
                event &&
                item &&
                RemoteMenu.call({
                    cmd:
                        itemType === LibraryItem.ALBUM
                            ? { items: [item as Album], type: LibraryItem.ALBUM }
                            : { items: [item as Playlist], type: LibraryItem.PLAYLIST },
                    event,
                }),
        };
    }, [itemType]);

    const cards = useMemo(
        () =>
            data.map((item) => ({
                content: (
                    <MemoizedItemCard
                        controls={controls}
                        data={item}
                        isRound={itemType === LibraryItem.ALBUM_ARTIST}
                        itemType={itemType}
                        rows={rows}
                        type="poster"
                        withControls={!!controls.onMore}
                    />
                ),
                id: item.id,
            })),
        [controls, data, itemType, rows],
    );

    if (cards.length === 0) return null;

    return (
        <GridCarousel
            cards={cards}
            containerQuery={containerQuery}
            onNextPage={() => {}}
            onPrevPage={() => {}}
            rowCount={1}
            title={
                plainTitle ? title : <RemoteSectionTitle extra={extra}>{title}</RemoteSectionTitle>
            }
        />
    );
};
