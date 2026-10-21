import { Route, Routes } from 'react-router';

import { DownloadsRoute } from '/@/renderer/features/naviseerr/routes/downloads-route';
import { useNaviseerrAddress } from '/@/renderer/features/naviseerr/store/naviseerr-store';

/** The module's own pages, under /naviseerr/*. */
const NaviseerrRoutes = () => {
    const address = useNaviseerrAddress();
    if (!address) return null;
    return (
        <Routes>
            <Route element={<DownloadsRoute />} path="downloads" />
        </Routes>
    );
};

export default NaviseerrRoutes;
