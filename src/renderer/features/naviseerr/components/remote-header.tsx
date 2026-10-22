import { useTranslation } from 'react-i18next';
import { generatePath, useNavigate } from 'react-router';

import { RemoteSong } from '/@/renderer/features/naviseerr/api/map';
import { useRowStates } from '/@/renderer/features/naviseerr/components/remote-song-table';
import {
    findDownload,
    isLive,
    requestCollectionDownload,
    useActiveDownloads,
} from '/@/renderer/features/naviseerr/hooks/use-downloads';
import {
    findLibraryAlbum,
    useMediaServer,
    usePlayFromLibrary,
} from '/@/renderer/features/naviseerr/hooks/use-library-state';
import { LibraryHeaderBar } from '/@/renderer/features/shared/components/library-header-bar';
import menuStyles from '/@/renderer/features/shared/components/library-header.module.css';
import {
    DefaultPlayButton,
    PlayTextButton,
} from '/@/renderer/features/shared/components/play-button';
import { AppRoute } from '/@/renderer/router/routes';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Button } from '/@/shared/components/button/button';
import { Group } from '/@/shared/components/group/group';
import { Icon } from '/@/shared/components/icon/icon';
import { Spinner } from '/@/shared/components/spinner/spinner';
import { toast } from '/@/shared/components/toast/toast';

export interface HeaderAction {
    busy: boolean;
    goToAlbum?: () => void;
    icon: 'download' | 'mediaPlay';
    label: string;
    onClick?: () => void;
    onMore?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

/** Download for an album or playlist you don't have; "Downloading 3 of 12" while it runs. */
export const useCollectionAction = ({
    id,
    songs,
    type,
}: {
    id: string;
    songs: RemoteSong[];
    type: 'ALBUM' | 'PLAYLIST';
}): HeaderAction => {
    const { t } = useTranslation('naviseerr');
    const navigate = useNavigate();
    const download = findDownload(useActiveDownloads(), id, type);
    const stateOf = useRowStates(songs);
    const play = usePlayFromLibrary();
    const mediaServer = useMediaServer();
    const allInLibrary = songs.length > 0 && songs.every((song) => stateOf(song).kind === 'done');

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

    if (allInLibrary) {
        const ids = songs.map((song) => song._nvs.youtubeId);
        return {
            busy: false,
            goToAlbum:
                mediaServer && type === 'ALBUM'
                    ? () =>
                          findLibraryAlbum(mediaServer, ids[0]).then((albumId) =>
                              albumId
                                  ? navigate(
                                        generatePath(AppRoute.LIBRARY_ALBUMS_DETAIL, { albumId }),
                                    )
                                  : toast.error({ message: t('play.NOT_FOUND_IN_MEDIA_SERVER') }),
                          )
                    : undefined,
            icon: 'mediaPlay',
            label: play ? t('action.play') : t('row.inLibrary'),
            onClick: play ? () => play(ids) : undefined,
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
export const RemoteHeaderMenu = ({ action }: { action: HeaderAction }) => {
    const { t } = useTranslation('naviseerr');
    return (
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
                {action.goToAlbum && (
                    <Button onClick={action.goToAlbum} size="md" variant="transparent">
                        {t('action.goToAlbum')}
                    </Button>
                )}
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
};
