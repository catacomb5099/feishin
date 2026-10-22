import { ReactNode, useMemo } from 'react';

import { GridCarousel } from '/@/renderer/components/grid-carousel/grid-carousel-v2';
import { MemoizedItemCard } from '/@/renderer/components/item-card/item-card';
import { useGridRows } from '/@/renderer/components/item-list/helpers/use-grid-rows';
import { ItemControls } from '/@/renderer/components/item-list/types';
import styles from '/@/renderer/features/artists/components/album-artist-detail-content.module.css';
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
    controls?: ItemControls;
    data: (Album | AlbumArtist | Playlist)[];
    itemType: keyof typeof LIST_KEYS;
    title: ReactNode;
}

/** A shelf of Feishin cards for things you don't have: open on click, no Play on hover. */
export const RemoteCarousel = ({ controls, data, itemType, title }: RemoteCarouselProps) => {
    const rows = useGridRows(itemType, LIST_KEYS[itemType]);

    const cards = useMemo(
        () =>
            data.map((item) => ({
                content: (
                    <MemoizedItemCard
                        controls={controls ?? {}}
                        data={item}
                        isRound={itemType === LibraryItem.ALBUM_ARTIST}
                        itemType={itemType}
                        rows={rows}
                        type="poster"
                        withControls={!!controls?.onMore}
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
            onNextPage={() => {}}
            onPrevPage={() => {}}
            rowCount={1}
            title={<RemoteSectionTitle>{title}</RemoteSectionTitle>}
        />
    );
};
