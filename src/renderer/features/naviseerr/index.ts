// The only file upstream Feishin imports from this module (see README.md).
import { lazy } from 'react';

import i18n from '/@/i18n/i18n';
import en from '/@/renderer/features/naviseerr/i18n/en.json';

i18n.addResourceBundle('en', 'naviseerr', en);

export {
    NaviseerrSearchResults,
    NaviseerrSearchTab,
} from '/@/renderer/features/naviseerr/components/naviseerr-search-results';
export { NaviseerrSearchSection } from '/@/renderer/features/naviseerr/components/naviseerr-search-section';
export { NaviseerrSettings } from '/@/renderer/features/naviseerr/components/naviseerr-settings';
export const NaviseerrRoutes = lazy(
    () => import('/@/renderer/features/naviseerr/routes/naviseerr-routes'),
);
export { withRemote } from '/@/renderer/features/naviseerr/routes/with-remote';
