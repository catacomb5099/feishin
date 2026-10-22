import { useTranslation } from 'react-i18next';

import { RemoteSong } from '/@/renderer/features/naviseerr/api/map';
import {
    findDownload,
    isLive,
    requestCollectionDownload,
    useActiveDownloads,
} from '/@/renderer/features/naviseerr/hooks/use-downloads';
import { LibraryHeaderBar } from '/@/renderer/features/shared/components/library-header-bar';
import menuStyles from '/@/renderer/features/shared/components/library-header.module.css';
import {
    DefaultPlayButton,
    PlayTextButton,
} from '/@/renderer/features/shared/components/play-button';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Group } from '/@/shared/components/group/group';
import { Icon } from '/@/shared/components/icon/icon';
import { Spinner } from '/@/shared/components/spinner/spinner';

export interface HeaderAction {
    busy: boolean;
    icon: 'download' | 'mediaPlay';
    label: string;
    onClick?: () => void;
    onMore?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

/** Download for an album or playlist you don't have; "Downloading 3 of 12" while it runs. */
export const useCollectionAction = ({
    id,
    type,
}: {
    id: string;
    songs: RemoteSong[];
    type: 'ALBUM' | 'PLAYLIST';
}): HeaderAction => {
    const { t } = useTranslation('naviseerr');
    const download = findDownload(useActiveDownloads(), id, type);

    if (download && isLive(download)) {
        return {
            busy: true,
            icon: 'download',
            label: download.songCount
                ? t('header.downloadingCount', {
                      done: download.songsSucceeded,
                      total: download.songCount,
                  })
                : t('header.downloading'),
        };
    }

    return {
        busy: false,
        icon: 'download',
        label: t('action.download'),
        onClick: () => requestCollectionDownload(id, type).catch(() => {}),
    };
};

/** The sticky bar's round button, Feishin's own play button with the action's icon. */
export const RemoteHeaderBar = ({ action, title }: { action: HeaderAction; title: string }) => (
    <LibraryHeaderBar>
        <DefaultPlayButton
            aria-label={action.label}
            disabled={!action.onClick}
            icon={action.icon}
            loading={action.busy}
            onClick={action.onClick}
            variant="default"
        />
        <LibraryHeaderBar.Title>{title}</LibraryHeaderBar.Title>
    </LibraryHeaderBar>
);

/** Feishin's header action row with one wide button where Play would be. */
export const RemoteHeaderMenu = ({ action }: { action: HeaderAction }) => (
    <div className={menuStyles.libraryHeaderMenu}>
        <Group wrap="nowrap">
            <PlayTextButton disabled={!action.onClick} onClick={action.onClick}>
                <Group gap="sm" wrap="nowrap">
                    {action.busy ? (
                        <Spinner color="black" />
                    ) : (
                        <Icon icon={action.icon} size="lg" />
                    )}
                    <span>{action.label}</span>
                </Group>
            </PlayTextButton>
        </Group>
        <Group gap="sm" wrap="nowrap">
            {action.onMore && (
                <ActionIcon
                    icon="ellipsisHorizontal"
                    onClick={action.onMore}
                    size="lg"
                    variant="transparent"
                />
            )}
        </Group>
    </div>
);
