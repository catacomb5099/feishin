import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router';

import styles from './discover-route.module.css';

import { api } from '/@/renderer/api';
import { matchSong } from '/@/renderer/features/discover/match-song';
import { usePlayer } from '/@/renderer/features/player/context/player-context';
import { AnimatedPage } from '/@/renderer/features/shared/components/animated-page';
import { AppRoute } from '/@/renderer/router/routes';
import { useCurrentServerId } from '/@/renderer/store';
import { useGeneralSettings } from '/@/renderer/store/settings.store';
import { Play } from '/@/shared/types/types';

type PlayRequest = { artists?: string[]; id?: string; title?: string; type?: string };

// Naviseerr opens YouTube Music after 1.5 s without an answer (ANSWER_WAIT_MS); stay under it so a
// slow library search never plays here as well.
const ANSWER_DEADLINE_MS = 1200;

// Naviseerr (the web app that finds and downloads music) shown whole. `from` tells it where it is
// shown, so its sign-in comes back here: the owner's proxy strips the referrer between sites.
const DiscoverRoute = () => {
    const { t } = useTranslation();
    const { naviseerrUrl } = useGeneralSettings();
    const serverId = useCurrentServerId();
    const player = usePlayer();
    const frame = useRef<HTMLIFrameElement>(null);
    const origin = URL.canParse(naviseerrUrl) ? new URL(naviseerrUrl).origin : null;

    // Play inside Naviseerr asks here first: a song already in this library plays in Feishin's player,
    // and the answer tells Naviseerr whether to open YouTube Music instead.
    useEffect(() => {
        if (!origin) return undefined;
        const onMessage = async (event: MessageEvent<PlayRequest>) => {
            if (event.origin !== origin || event.source !== frame.current?.contentWindow) return;
            const { artists, id, title, type } = event.data ?? {};
            if (type !== 'naviseerr:play' || !title) return;
            const asked = Date.now();
            let song;
            try {
                const found = await api.controller.search({
                    apiClientProps: { serverId },
                    query: { albumArtistLimit: 0, albumLimit: 0, query: title, songLimit: 20 },
                });
                song = matchSong(found?.songs ?? [], title, artists?.[0]);
            } catch {
                song = undefined;
            }
            if (Date.now() - asked > ANSWER_DEADLINE_MS) song = undefined;
            if (song) player.addToQueueByData([song], Play.NOW);
            frame.current?.contentWindow?.postMessage(
                { id, played: Boolean(song), type: 'naviseerr:played' },
                origin,
            );
        };
        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, [origin, player, serverId]);

    if (!origin) return <Navigate replace to={AppRoute.HOME} />;

    const src = `${naviseerrUrl.replace(/\/+$/, '')}/?from=${encodeURIComponent(window.location.href)}`;

    return (
        <AnimatedPage>
            <iframe
                allow="clipboard-write"
                className={styles.frame}
                ref={frame}
                src={src}
                title={t('page.sidebar.discover')}
            />
        </AnimatedPage>
    );
};

export default DiscoverRoute;
