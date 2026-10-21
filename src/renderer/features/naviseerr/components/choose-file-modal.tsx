import { useQuery, useQueryClient } from '@tanstack/react-query';
import formatDuration from 'format-duration';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import i18n from '/@/i18n/i18n';
import { naviseerrQueries, nvsKeys } from '/@/renderer/features/naviseerr/api/naviseerr-api';
import { NaviseerrError, nvsRequest } from '/@/renderer/features/naviseerr/api/naviseerr-client';
import { ActiveDownload, Candidates } from '/@/renderer/features/naviseerr/api/types';
import { pollDownloads } from '/@/renderer/features/naviseerr/hooks/use-downloads';
import { useNaviseerrAddress } from '/@/renderer/features/naviseerr/store/naviseerr-store';
import { formatSizeString } from '/@/renderer/utils';
import { Button } from '/@/shared/components/button/button';
import { Group } from '/@/shared/components/group/group';
import { closeAllModals, openModal } from '/@/shared/components/modal/modal';
import { ScrollArea } from '/@/shared/components/scroll-area/scroll-area';
import { Select } from '/@/shared/components/select/select';
import { Spinner } from '/@/shared/components/spinner/spinner';
import { Stack } from '/@/shared/components/stack/stack';
import { Table } from '/@/shared/components/table/table';
import { TextInput } from '/@/shared/components/text-input/text-input';
import { Text } from '/@/shared/components/text/text';
import { toast } from '/@/shared/components/toast/toast';

const fileName = (path: string) => path.split(/[\\/]/).pop() ?? path;
const folderName = (path: string) => path.split(/[\\/]/).slice(0, -1).join('/');

const CandidateTable = ({ downloadId, taskId }: { downloadId: string; taskId: string }) => {
    const { t } = useTranslation('naviseerr');
    const address = useNaviseerrAddress();
    const queryClient = useQueryClient();
    const query = useQuery(naviseerrQueries.candidates(address, downloadId, taskId));
    const [text, setText] = useState('');
    const [searching, setSearching] = useState(false);
    const view = query.data;

    useEffect(() => {
        if (view?.query) setText((old) => old || view.query || '');
    }, [view?.query]);

    const path = `/downloads/${downloadId}/tasks/${taskId}`;

    const search = async () => {
        setSearching(true);
        try {
            const answer = await nvsRequest<Candidates>(`${path}/search`, {
                body: { text },
                method: 'POST',
            });
            queryClient.setQueryData(
                naviseerrQueries.candidates(address, downloadId, taskId).queryKey,
                answer,
            );
        } catch (error) {
            toast.error({ message: (error as NaviseerrError).message });
        } finally {
            setSearching(false);
        }
    };

    const pick = async (username: string, filename: string) => {
        try {
            await nvsRequest(`${path}/pick`, { body: { filename, username }, method: 'POST' });
            toast.info({ message: t('chooseFile.picked', { file: fileName(filename) }) });
            queryClient.invalidateQueries({ queryKey: nvsKeys.activeDownloads(address) });
            pollDownloads();
            closeAllModals();
        } catch (error) {
            toast.error({ message: (error as NaviseerrError).message });
        }
    };

    return (
        <Stack gap="md">
            <Group align="end" gap="sm" wrap="nowrap">
                <TextInput
                    flex={1}
                    label={t('chooseFile.searchFor')}
                    onChange={(e) => setText(e.currentTarget.value)}
                    onKeyDown={(e) => e.key === 'Enter' && search()}
                    value={text}
                />
                <Button
                    disabled={!text.trim()}
                    loading={searching}
                    onClick={search}
                    variant="filled"
                >
                    {t('chooseFile.search')}
                </Button>
            </Group>
            {query.isLoading && <Spinner container />}
            {view && view.candidates.length === 0 && (
                <Text isMuted>
                    {view.status === 'SEARCHING'
                        ? t('chooseFile.stillSearching')
                        : t(`chooseFile.reason.${view.reason ?? 'NO_RESULTS'}`, {
                              defaultValue: t('chooseFile.reason.NO_RESULTS'),
                          })}
                </Text>
            )}
            {view && view.candidates.length > 0 && (
                <ScrollArea style={{ maxHeight: '55vh' }}>
                    <Table highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>{t('chooseFile.file')}</Table.Th>
                                <Table.Th>{t('chooseFile.quality')}</Table.Th>
                                <Table.Th>{t('chooseFile.length')}</Table.Th>
                                <Table.Th>{t('chooseFile.size')}</Table.Th>
                                <Table.Th>{t('chooseFile.match')}</Table.Th>
                                <Table.Th />
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {view.candidates.map((c) => (
                                <Table.Tr key={`${c.username}/${c.filename}`}>
                                    <Table.Td maw={320}>
                                        <Text size="sm" truncate>
                                            {fileName(c.filename)}
                                        </Text>
                                        <Text isMuted size="xs" truncate>
                                            {c.username} · {folderName(c.filename)}
                                        </Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <Text size="sm">
                                            {[c.extension, c.bitrateKbps && `${c.bitrateKbps} kbps`]
                                                .filter(Boolean)
                                                .join(' · ')}
                                        </Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <Text size="sm">
                                            {c.lengthSeconds
                                                ? formatDuration(c.lengthSeconds * 1000)
                                                : ''}
                                        </Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <Text size="sm">{formatSizeString(c.size)}</Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <Text size="sm">
                                            {t(`chooseFile.grade.${c.grade}`, {
                                                defaultValue: c.grade,
                                            })}
                                        </Text>
                                    </Table.Td>
                                    <Table.Td>
                                        {c.isCurrent ? (
                                            <Text isMuted size="sm">
                                                {t('chooseFile.current')}
                                            </Text>
                                        ) : (
                                            <Button
                                                onClick={() => pick(c.username, c.filename)}
                                                size="compact-sm"
                                                variant="default"
                                            >
                                                {t('chooseFile.use')}
                                            </Button>
                                        )}
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                </ScrollArea>
            )}
        </Stack>
    );
};

const ChooseFile = ({ download }: { download: ActiveDownload }) => {
    const { t } = useTranslation('naviseerr');
    const address = useNaviseerrAddress();
    const detail = useQuery(naviseerrQueries.downloadDetail(address, download.downloadId));
    const songs = detail.data?.songs ?? [];
    // The songs that need a person first: failed, then the rest in album order.
    const ordered = [...songs].sort(
        (a, b) =>
            Number(b.stage === 'FAILED') - Number(a.stage === 'FAILED') || a.position - b.position,
    );
    const [taskId, setTaskId] = useState<null | string>(null);
    const chosen = taskId ?? ordered[0]?.taskId ?? null;
    const song = songs.find((s) => s.taskId === chosen);

    if (!detail.data) return <Spinner container />;

    return (
        <Stack gap="md">
            {songs.length > 1 ? (
                <Select
                    data={ordered.map((s) => ({
                        label: `${s.position}. ${s.title ?? s.youtubeId}`,
                        value: s.taskId,
                    }))}
                    label={t('chooseFile.song')}
                    onChange={(value) => value && setTaskId(value)}
                    value={chosen}
                />
            ) : (
                <Text fw={600}>{[song?.title, song?.artists[0]].filter(Boolean).join(' · ')}</Text>
            )}
            {chosen && (
                <CandidateTable downloadId={download.downloadId} key={chosen} taskId={chosen} />
            )}
        </Stack>
    );
};

/** Manual import as a Feishin modal: the files Soulseek found for a song, and a new search. */
export const openChooseFile = (download: ActiveDownload) =>
    openModal({
        children: <ChooseFile download={download} />,
        size: 'xl',
        title: i18n.t('chooseFile.title', { ns: 'naviseerr', title: download.title ?? '' }),
    });
