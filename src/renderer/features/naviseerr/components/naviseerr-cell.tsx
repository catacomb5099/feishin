import { createContext, useContext } from 'react';
import { useTranslation } from 'react-i18next';

import {
    ItemTableListColumn,
    TableColumnContainer,
    TableColumnTextContainer,
} from '/@/renderer/components/item-list/item-table-list/item-table-list-column';
import { RemoteSong } from '/@/renderer/features/naviseerr/api/map';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Group } from '/@/shared/components/group/group';
import { Icon } from '/@/shared/components/icon/icon';
import { Spinner } from '/@/shared/components/spinner/spinner';
import { Text } from '/@/shared/components/text/text';
import { Tooltip } from '/@/shared/components/tooltip/tooltip';
import { TableColumn } from '/@/shared/types/types';

export type RowState =
    | { kind: 'busy'; percent: null | number }
    | { kind: 'done' }
    | { kind: 'download' }
    | { kind: 'failed'; reason: string };

interface RemoteRows {
    activate: (song: RemoteSong) => void;
    more?: (song: RemoteSong, event: React.MouseEvent<HTMLButtonElement>) => void;
    stateOf: (song: RemoteSong) => RowState;
}

export const RemoteRowsContext = createContext<RemoteRows>({
    activate: () => {},
    stateOf: () => ({ kind: 'download' }),
});

const RowStateCell = (props: ItemTableListColumn & { song: RemoteSong; type: TableColumn }) => {
    const { t } = useTranslation('naviseerr');
    const { activate, more, stateOf } = useContext(RemoteRowsContext);
    const state = stateOf(props.song);

    const stop = (event: React.MouseEvent) => {
        event.stopPropagation();
        event.preventDefault();
    };

    const indicator = (() => {
        switch (state.kind) {
            case 'busy':
                return (
                    <Group gap={4} wrap="nowrap">
                        <Spinner size={14} />
                        {state.percent !== null && (
                            <Text isMuted size="xs">
                                {Math.round(state.percent)}%
                            </Text>
                        )}
                    </Group>
                );
            case 'done':
                return (
                    <Tooltip label={t('row.inLibrary')}>
                        <Icon aria-label={t('row.inLibrary')} color="primary" icon="success" />
                    </Tooltip>
                );
            case 'failed':
                return (
                    <ActionIcon
                        aria-label={state.reason}
                        icon="error"
                        iconProps={{ color: 'error', size: 'md' }}
                        onClick={(event) => {
                            stop(event);
                            activate(props.song);
                        }}
                        onDoubleClick={stop}
                        size="xs"
                        tooltip={{ label: `${state.reason} ${t('row.tryAgain')}` }}
                        variant="subtle"
                    />
                );
            default:
                return (
                    <ActionIcon
                        aria-label={t('action.download')}
                        icon="download"
                        iconProps={{ color: 'muted', size: 'md' }}
                        onClick={(event) => {
                            stop(event);
                            activate(props.song);
                        }}
                        onDoubleClick={stop}
                        size="xs"
                        tooltip={{ label: t('action.download') }}
                        variant="subtle"
                    />
                );
        }
    })();

    return (
        <TableColumnContainer {...props} controls={props.controls} type={props.type}>
            <Group gap="xs" wrap="nowrap">
                {indicator}
                {more && (
                    <ActionIcon
                        className="hover-only"
                        icon="ellipsisHorizontal"
                        iconProps={{ color: 'muted', size: 'md' }}
                        onClick={(event) => {
                            stop(event);
                            more(props.song, event);
                        }}
                        onDoubleClick={stop}
                        size="xs"
                        variant="subtle"
                    />
                )}
            </Group>
        </TableColumnContainer>
    );
};

/** Feishin's own cell, except the plays text (YouTube's words) and the download state. */
export const NaviseerrCell = (props: ItemTableListColumn) => {
    const type = props.columns[props.columnIndex]?.id as TableColumn;
    const isDataRow = props.enableHeader ? props.rowIndex > 0 : true;
    const song = isDataRow
        ? ((props.getRowItem?.(props.rowIndex) ?? props.data[props.rowIndex]) as RemoteSong)
        : null;

    if (song?._nvs && type === TableColumn.PLAY_COUNT) {
        return (
            <TableColumnTextContainer {...props} controls={props.controls} type={type}>
                {song._nvs.plays ?? ' '}
            </TableColumnTextContainer>
        );
    }

    if (song?._nvs && type === TableColumn.ACTIONS) {
        return <RowStateCell {...props} song={song} type={type} />;
    }

    return <ItemTableListColumn {...props} />;
};
