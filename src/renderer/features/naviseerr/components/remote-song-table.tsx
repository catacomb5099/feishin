import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { SONG_TABLE_COLUMNS } from '/@/renderer/components/item-list/item-table-list/default-columns';
import { ItemTableList } from '/@/renderer/components/item-list/item-table-list/item-table-list';
import { ItemControls } from '/@/renderer/components/item-list/types';
import { RemoteSong } from '/@/renderer/features/naviseerr/api/map';
import { naviseerrQueries } from '/@/renderer/features/naviseerr/api/naviseerr-api';
import {
    NaviseerrCell,
    RemoteRowsContext,
    RowState,
} from '/@/renderer/features/naviseerr/components/naviseerr-cell';
import {
    failureText,
    findDownload,
    isLive,
    requestSongDownload,
    useActiveDownloads,
} from '/@/renderer/features/naviseerr/hooks/use-downloads';
import { useNaviseerrAddress } from '/@/renderer/features/naviseerr/store/naviseerr-store';
import { ItemTableListColumnConfig, useSettingsStore } from '/@/renderer/store';
import { LibraryItem } from '/@/shared/types/domain-types';
import { ItemListKey, TableColumn } from '/@/shared/types/types';

const columnsOf = (ids: TableColumn[]): ItemTableListColumnConfig[] =>
    ids.map((id) => {
        const column = SONG_TABLE_COLUMNS.find((c) => c.value === id);
        return {
            // The state icon stays put when the hover-only "..." appears beside it.
            align: id === TableColumn.ACTIONS ? 'start' : (column?.align ?? 'start'),
            autoSize: column?.autoSize ?? false,
            id,
            isEnabled: true,
            pinned: null,
            width: id === TableColumn.ACTIONS ? 90 : (column?.width ?? 100),
        };
    });

export const ALBUM_COLUMNS = columnsOf([
    TableColumn.TRACK_NUMBER,
    TableColumn.TITLE_COMBINED,
    TableColumn.PLAY_COUNT,
    TableColumn.DURATION,
    TableColumn.ACTIONS,
]);

export const ARTIST_COLUMNS = columnsOf([
    TableColumn.ROW_INDEX,
    TableColumn.TITLE_COMBINED,
    TableColumn.PLAY_COUNT,
    TableColumn.DURATION,
    TableColumn.ACTIONS,
]);

export const SEARCH_COLUMNS = columnsOf([
    TableColumn.TITLE_COMBINED,
    TableColumn.ALBUM,
    TableColumn.PLAY_COUNT,
    TableColumn.DURATION,
    TableColumn.ACTIONS,
]);

export const PLAYLIST_COLUMNS = columnsOf([
    TableColumn.ROW_INDEX,
    TableColumn.TITLE_COMBINED,
    TableColumn.DURATION,
    TableColumn.ACTIONS,
]);

/** S2 answer + the downloads feed -> one state per row. */
export const useRowStates = (songs: RemoteSong[]) => {
    const address = useNaviseerrAddress();
    const ids = useMemo(() => songs.map((song) => song._nvs.youtubeId), [songs]);
    const library = useQuery(naviseerrQueries.librarySongs(address, ids)).data;
    const downloads = useActiveDownloads();

    return useCallback(
        (song: RemoteSong): RowState => {
            const id = song._nvs.youtubeId;
            const download = findDownload(downloads, id, 'SONG');
            if (download && isLive(download)) {
                return {
                    kind: 'busy',
                    percent: download.stage === 'DOWNLOADING' ? download.progressPercent : null,
                };
            }
            if (library?.[id]?.state === 'IN_LIBRARY') return { kind: 'done' };
            if (library?.[id]?.state === 'ON_ITS_WAY') return { kind: 'busy', percent: null };
            if (download?.stage === 'SUCCEEDED') return { kind: 'done' };
            if (download?.stage === 'FAILED')
                return { kind: 'failed', reason: failureText(download) };
            return { kind: 'download' };
        },
        [downloads, library],
    );
};

interface RemoteSongTableProps {
    columns: ItemTableListColumnConfig[];
    onMore?: (song: RemoteSong, event: React.MouseEvent<unknown>) => void;
    songs: RemoteSong[];
}

/** Feishin's song table for songs you may not have: Download instead of Play. */
export const RemoteSongTable = ({ columns, onMore, songs }: RemoteSongTableProps) => {
    const tableConfig = useSettingsStore((state) => state.lists[ItemListKey.ALBUM_DETAIL]?.table);
    const stateOf = useRowStates(songs);

    const activate = useCallback(
        (song: RemoteSong) => {
            const state = stateOf(song);
            if (state.kind === 'download' || state.kind === 'failed') {
                requestSongDownload(song._nvs.youtubeId).catch(() => {});
            }
        },
        [stateOf],
    );

    const rows = useMemo(() => ({ activate, more: onMore, stateOf }), [activate, onMore, stateOf]);

    const overrideControls: Partial<ItemControls> = useMemo(
        () => ({
            onDoubleClick: ({ item }) => item && activate(item as RemoteSong),
            onMore: ({ event, item }) => event && item && onMore?.(item as RemoteSong, event),
            // Tables use onPlay only for Enter and the play hotkeys: those download here.
            onPlay: ({ item }) => item && activate(item as RemoteSong),
        }),
        [activate, onMore],
    );

    return (
        <RemoteRowsContext.Provider value={rows}>
            <ItemTableList
                autoFitColumns
                CellComponent={NaviseerrCell}
                columns={columns}
                data={songs}
                enableAlternateRowColors={tableConfig?.enableAlternateRowColors}
                enableDrag={false}
                enableDragScroll={false}
                enableEntranceAnimation={false}
                enableExpansion={false}
                enableHeader={tableConfig?.enableHeader ?? true}
                enableHorizontalBorders={tableConfig?.enableHorizontalBorders}
                enableRowHoverHighlight={tableConfig?.enableRowHoverHighlight ?? true}
                enableSelection
                enableSelectionDialog={false}
                enableStickyHeader
                enableVerticalBorders={tableConfig?.enableVerticalBorders}
                itemType={LibraryItem.SONG}
                overrideControls={overrideControls}
                size={tableConfig?.size}
            />
        </RemoteRowsContext.Provider>
    );
};
