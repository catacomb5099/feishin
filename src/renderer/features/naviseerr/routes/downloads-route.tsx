import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { generatePath, useNavigate } from 'react-router';

import { ItemImage } from '/@/renderer/components/item-image/item-image';
import { PageHeader } from '/@/renderer/components/page-header/page-header';
import { toNvsId } from '/@/renderer/features/naviseerr/api/map';
import { naviseerrQueries } from '/@/renderer/features/naviseerr/api/naviseerr-api';
import { ActiveDownload } from '/@/renderer/features/naviseerr/api/types';
import { openChooseFile } from '/@/renderer/features/naviseerr/components/choose-file-modal';
import { RemoteEmptyState } from '/@/renderer/features/naviseerr/components/remote-empty-state';
import {
    downloadAgain,
    failureText,
    isLive,
    useActiveDownloads,
    useDownloadAction,
} from '/@/renderer/features/naviseerr/hooks/use-downloads';
import { useNaviseerrAddress } from '/@/renderer/features/naviseerr/store/naviseerr-store';
import styles from '/@/renderer/features/radio/components/radio-list-items.module.css';
import { AnimatedPage } from '/@/renderer/features/shared/components/animated-page';
import { FilterBar } from '/@/renderer/features/shared/components/filter-bar';
import { LibraryHeaderBar } from '/@/renderer/features/shared/components/library-header-bar';
import { AppRoute } from '/@/renderer/router/routes';
import { formatDateRelative } from '/@/renderer/utils';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Box } from '/@/shared/components/box/box';
import { DropdownMenu } from '/@/shared/components/dropdown-menu/dropdown-menu';
import { Flex } from '/@/shared/components/flex/flex';
import { Group } from '/@/shared/components/group/group';
import { Pagination } from '/@/shared/components/pagination/pagination';
import { Paper } from '/@/shared/components/paper/paper';
import { Progress } from '/@/shared/components/progress/progress';
import { ScrollArea } from '/@/shared/components/scroll-area/scroll-area';
import { SegmentedControl } from '/@/shared/components/segmented-control/segmented-control';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';
import { LibraryItem } from '/@/shared/types/domain-types';

const PAGE_SIZE = 25;

const pageOf = (download: ActiveDownload) => {
    const id = toNvsId(download.youtubeId);
    if (download.downloadType === 'ALBUM') {
        return generatePath(AppRoute.LIBRARY_ALBUMS_DETAIL, { albumId: id });
    }
    if (download.downloadType === 'PLAYLIST') {
        return generatePath(AppRoute.PLAYLISTS_DETAIL_SONGS, { playlistId: id });
    }
    return null;
};

const DownloadStatus = ({ download }: { download: ActiveDownload }) => {
    const { t } = useTranslation('naviseerr');
    const isCollection = download.downloadType !== 'SONG';
    const count =
        isCollection && download.songCount
            ? ` · ${download.songsSucceeded}/${download.songCount}`
            : '';

    if (download.stage === 'DOWNLOADING') {
        const percent = Math.round(download.progressPercent ?? 0);
        return (
            <Stack gap={4} w={140}>
                <Text isMuted size="sm">
                    {t('stage.DOWNLOADING', { percent })}
                    {count}
                </Text>
                <Progress size="sm" value={percent} />
            </Stack>
        );
    }
    if (download.stage === 'FAILED') {
        return (
            <Text c="var(--theme-colors-state-error)" size="sm">
                {failureText(download)}
            </Text>
        );
    }
    return (
        <Text isMuted size="sm">
            {t(`stage.${download.stage}`, {
                done: download.songsSucceeded,
                total: download.songCount,
            })}
            {download.stage === 'PARTIAL_SUCCESS' ? '' : count}
        </Text>
    );
};

const DownloadRow = ({ download }: { download: ActiveDownload }) => {
    const { t } = useTranslation('naviseerr');
    const { t: tf } = useTranslation();
    const navigate = useNavigate();
    const act = useDownloadAction();
    const page = pageOf(download);
    const type = {
        ALBUM: tf('entity.album', { count: 1 }),
        PLAYLIST: tf('entity.playlist', { count: 1 }),
        SONG: tf('entity.song', { count: 1 }),
    }[download.downloadType];
    const meta = [type, download.artists.join(', '), formatDateRelative(download.requestedAt)]
        .filter(Boolean)
        .join(' · ');
    const failed = download.stage === 'FAILED' || download.stage === 'PARTIAL_SUCCESS';

    return (
        <Paper className={styles['radio-item']} p="md">
            <Flex align="center" gap="md" justify="space-between" wrap="nowrap">
                <button
                    className={styles['radio-item-button']}
                    disabled={!page}
                    onClick={() => page && navigate(page)}
                    type="button"
                >
                    <Group align="center" gap="md" wrap="nowrap">
                        <Box className={styles.thumbnail}>
                            <ItemImage
                                enableViewport={false}
                                imageContainerProps={{ className: styles['image-container'] }}
                                itemType={LibraryItem.ALBUM}
                                src={download.imageUrl ?? ''}
                                type="table"
                            />
                        </Box>
                        <Stack className={styles.meta} gap={4}>
                            <Text fw={500} size="md">
                                {download.title ?? download.youtubeId}
                            </Text>
                            <Text className={styles['meta-line']} isMuted size="sm">
                                {meta}
                            </Text>
                        </Stack>
                    </Group>
                </button>
                <Group gap="md" wrap="nowrap">
                    <DownloadStatus download={download} />
                    <DropdownMenu position="bottom-end">
                        <DropdownMenu.Target>
                            <ActionIcon
                                aria-label={t('downloads.more')}
                                icon="ellipsisHorizontal"
                                size="sm"
                                variant="subtle"
                            />
                        </DropdownMenu.Target>
                        <DropdownMenu.Dropdown>
                            {isLive(download) && (
                                <DropdownMenu.Item onClick={() => act(download, 'cancel')}>
                                    {t('downloads.cancel')}
                                </DropdownMenu.Item>
                            )}
                            {failed && (
                                <DropdownMenu.Item onClick={() => act(download, 'retry')}>
                                    {t('downloads.retry')}
                                </DropdownMenu.Item>
                            )}
                            {download.stage !== 'SUCCEEDED' && (
                                <DropdownMenu.Item onClick={() => openChooseFile(download)}>
                                    {t('chooseFile.action')}
                                </DropdownMenu.Item>
                            )}
                            {download.stage === 'SUCCEEDED' && (
                                <DropdownMenu.Item onClick={() => downloadAgain(download)}>
                                    {t('downloads.again')}
                                </DropdownMenu.Item>
                            )}
                        </DropdownMenu.Dropdown>
                    </DropdownMenu>
                </Group>
            </Flex>
        </Paper>
    );
};

const DownloadList = ({ downloads }: { downloads: ActiveDownload[] }) => {
    const { t } = useTranslation('naviseerr');
    if (downloads.length === 0) {
        return (
            <Text isMuted p="xl" ta="center">
                {t('downloads.empty')}
            </Text>
        );
    }
    return (
        <Stack gap="sm">
            {downloads.map((download) => (
                <DownloadRow download={download} key={download.downloadId} />
            ))}
        </Stack>
    );
};

const HistoryList = () => {
    const address = useNaviseerrAddress();
    const [page, setPage] = useState(1);
    const query = useQuery(naviseerrQueries.allDownloads(address, page, PAGE_SIZE));

    if (!query.data) return <RemoteEmptyState error={query.error} loading={query.isLoading} />;

    return (
        <Stack gap="md">
            <DownloadList downloads={query.data.downloads} />
            {query.data.totalPages > 1 && (
                <Group justify="center">
                    <Pagination
                        itemsPerPage={PAGE_SIZE}
                        onChange={(index) => setPage(index + 1)}
                        total={query.data.totalPages}
                        // ponytail: the server sends pages, not a count; the last page's "of N" is rounded up
                        totalItemCount={query.data.totalPages * PAGE_SIZE}
                        value={page - 1}
                    />
                </Group>
            )}
        </Stack>
    );
};

/** Sonarr-style queue built like Feishin's Radio page: what is downloading now, and everything before. */
export const DownloadsRoute = () => {
    const { t } = useTranslation('naviseerr');
    const [tab, setTab] = useState<'active' | 'history'>('active');
    const active = useActiveDownloads();

    return (
        <AnimatedPage>
            <Stack gap={0}>
                <PageHeader>
                    <LibraryHeaderBar ignoreMaxWidth>
                        <LibraryHeaderBar.Title>{t('downloads.title')}</LibraryHeaderBar.Title>
                        <LibraryHeaderBar.Badge isLoading={!active}>
                            {active?.filter(isLive).length}
                        </LibraryHeaderBar.Badge>
                    </LibraryHeaderBar>
                </PageHeader>
                <FilterBar>
                    <SegmentedControl
                        data={[
                            { label: t('downloads.active'), value: 'active' },
                            { label: t('downloads.history'), value: 'history' },
                        ]}
                        onChange={(value) => setTab(value as 'active' | 'history')}
                        size="sm"
                        value={tab}
                    />
                </FilterBar>
            </Stack>
            <ScrollArea>
                <Box p="md">
                    {tab === 'active' ? <DownloadList downloads={active ?? []} /> : <HistoryList />}
                </Box>
            </ScrollArea>
        </AnimatedPage>
    );
};
