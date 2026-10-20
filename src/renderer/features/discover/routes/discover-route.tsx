import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router';

import styles from './discover-route.module.css';

import { AnimatedPage } from '/@/renderer/features/shared/components/animated-page';
import { AppRoute } from '/@/renderer/router/routes';
import { useGeneralSettings } from '/@/renderer/store/settings.store';

// Naviseerr (the web app that finds and downloads music) shown whole. `from` tells it where it is
// shown, so its sign-in comes back here: the owner's proxy strips the referrer between sites.
const DiscoverRoute = () => {
    const { t } = useTranslation();
    const { naviseerrUrl } = useGeneralSettings();

    if (!naviseerrUrl) return <Navigate replace to={AppRoute.HOME} />;

    const src = `${naviseerrUrl.replace(/\/+$/, '')}/?from=${encodeURIComponent(window.location.href)}`;

    return (
        <AnimatedPage>
            <iframe
                allow="clipboard-write"
                className={styles.frame}
                src={src}
                title={t('page.sidebar.discover')}
            />
        </AnimatedPage>
    );
};

export default DiscoverRoute;
