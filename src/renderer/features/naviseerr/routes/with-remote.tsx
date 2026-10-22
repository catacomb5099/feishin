import { ComponentType, lazy } from 'react';
import { useParams } from 'react-router';

import { isNvsId } from '/@/renderer/features/naviseerr/api/map';
import { useNaviseerrAddress } from '/@/renderer/features/naviseerr/store/naviseerr-store';

const remoteRoutes = {
    album: lazy(() =>
        import('/@/renderer/features/naviseerr/routes/remote-collection-route').then((m) => ({
            default: m.RemoteAlbumRoute,
        })),
    ),
    playlist: lazy(() =>
        import('/@/renderer/features/naviseerr/routes/remote-collection-route').then((m) => ({
            default: m.RemotePlaylistRoute,
        })),
    ),
};

/** Feishin's own page, or the module's page when the route's id is a YouTube Music one (nvs~...). */
export const withRemote = (Library: ComponentType, kind: keyof typeof remoteRoutes) => {
    const Remote = remoteRoutes[kind];
    const WithRemote = () => {
        const params = useParams();
        const address = useNaviseerrAddress();
        const isRemote = address && Object.values(params).some(isNvsId);
        return isRemote ? <Remote /> : <Library />;
    };
    return WithRemote;
};
