import { useQuery } from '@tanstack/react-query';
import formatDuration from 'format-duration';
import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import i18n from '/@/i18n/i18n';
import { naviseerrQueries } from '/@/renderer/features/naviseerr/api/naviseerr-api';
import { RemoteEmptyState } from '/@/renderer/features/naviseerr/components/remote-empty-state';
import { useNaviseerrAddress } from '/@/renderer/features/naviseerr/store/naviseerr-store';
import { openModal } from '/@/shared/components/modal/modal';
import { Table } from '/@/shared/components/table/table';

/** The song's YouTube Music details and credits, laid out like Feishin's own details modal. */
const SongInfo = ({ youtubeId }: { youtubeId: string }) => {
    const { t } = useTranslation('naviseerr');
    const address = useNaviseerrAddress();
    const query = useQuery(naviseerrQueries.songInfo(address, youtubeId));
    const song = query.data;

    if (!song) return <RemoteEmptyState error={query.error} loading={query.isLoading} />;

    const rows: [string, ReactNode][] = [
        [t('songInfo.title'), song.name],
        [t('songInfo.artists'), song.artists.map((artist) => artist.name).join(', ')],
        [t('songInfo.album'), song.album?.name],
        [t('songInfo.year'), song.year],
        [
            t('songInfo.length'),
            song.durationSeconds ? formatDuration(song.durationSeconds * 1000) : null,
        ],
        [t('songInfo.plays'), song.plays],
        [t('songInfo.explicit'), song.explicit ? t('songInfo.yes') : null],
        ...song.credits.map((credit): [string, ReactNode] => [
            credit.role,
            credit.names.join(', '),
        ]),
    ];

    return (
        <Table
            highlightOnHover={false}
            styles={{
                th: {
                    color: 'var(--theme-colors-foreground-muted)',
                    fontWeight: 500,
                    padding: 'var(--theme-spacing-sm)',
                },
                tr: {
                    color: 'var(--theme-colors-foreground-muted)',
                    padding: 'var(--theme-spacing-xl)',
                },
            }}
            withRowBorders
        >
            <Table.Tbody>
                {rows
                    .filter(([, value]) => value !== null && value !== undefined && value !== '')
                    .map(([label, value]) => (
                        <Table.Tr key={label}>
                            <Table.Th>{label}</Table.Th>
                            <Table.Td>{value}</Table.Td>
                        </Table.Tr>
                    ))}
            </Table.Tbody>
        </Table>
    );
};

export const openSongInfo = (youtubeId: string, title: string) =>
    openModal({
        children: <SongInfo youtubeId={youtubeId} />,
        size: 'lg',
        styles: { body: { paddingBottom: 'var(--theme-spacing-xl)' } },
        title: title || i18n.t('songInfo.heading', { ns: 'naviseerr' }),
    });
