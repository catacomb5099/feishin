import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useGridCarouselContainerQuery } from '/@/renderer/components/grid-carousel/grid-carousel-v2';
import { CURATED_PREFIX, toPlaylist } from '/@/renderer/features/naviseerr/api/map';
import { naviseerrQueries } from '/@/renderer/features/naviseerr/api/naviseerr-api';
import { SuggestedPlaylist } from '/@/renderer/features/naviseerr/api/types';
import { RemoteMenu } from '/@/renderer/features/naviseerr/components/remote-context-menu';
import { RemoteCarousel } from '/@/renderer/features/naviseerr/components/remote-section';
import { useNaviseerrAddress } from '/@/renderer/features/naviseerr/store/naviseerr-store';
import { LibraryItem } from '/@/shared/types/domain-types';

const ALL_TIME = 'all-time';

/** "1980-1989" is the 1980s; a range over several decades is all-time; anything else has no era. */
export const eraOf = (year: null | string) => {
    const match = /^(\d{4})-(\d{4})$/.exec(year ?? '');
    if (!match) return null;
    const [from, to] = [match[1], match[2]].map((y) => Math.floor(Number(y) / 10) * 10);
    return from === to ? `${from}s` : ALL_TIME;
};

/** Spotify's "Made for you" on Home: the server's suggested playlists, one shelf per era. */
export const NaviseerrHomeShelves = ({
    containerQuery,
}: {
    containerQuery?: ReturnType<typeof useGridCarouselContainerQuery>;
}) => {
    const { t } = useTranslation('naviseerr');
    const address = useNaviseerrAddress();
    const query = useQuery(naviseerrQueries.suggested(address));

    const shelves = useMemo(() => {
        const byEra = new Map<null | string, SuggestedPlaylist[]>();
        for (const playlist of query.data?.enabled ? query.data.playlists : []) {
            const era = eraOf(playlist.year);
            byEra.set(era, [...(byEra.get(era) ?? []), playlist]);
        }
        // All-time first, then the decades newest first, then the ones without an era.
        const rank = (era: null | string) =>
            era === ALL_TIME ? Infinity : era === null ? -Infinity : Number(era.slice(0, 4));
        return [...byEra.entries()].sort(([a], [b]) => rank(b) - rank(a));
    }, [query.data]);

    if (!address || shelves.length === 0) return null;

    return (
        <>
            {shelves.map(([era, playlists]) => (
                <RemoteCarousel
                    containerQuery={containerQuery}
                    data={playlists.map((playlist) =>
                        toPlaylist({
                            artistIds: [],
                            artists: [],
                            iconURL: '',
                            id: CURATED_PREFIX + playlist.category,
                            name: playlist.title,
                            trackCount: playlist.trackCount,
                            views: null,
                        }),
                    )}
                    itemType={LibraryItem.PLAYLIST}
                    key={era ?? 'none'}
                    plainTitle
                    title={
                        era
                            ? t('home.era', { era: era === ALL_TIME ? t('home.allTime') : era })
                            : t('home.madeForYou')
                    }
                />
            ))}
            <RemoteMenu.Root />
        </>
    );
};
