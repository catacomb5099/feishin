import { useQuery, useQueryClient } from '@tanstack/react-query';
import isElectron from 'is-electron';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { naviseerrQueries, nvsKeys } from '/@/renderer/features/naviseerr/api/naviseerr-api';
import { signIn } from '/@/renderer/features/naviseerr/api/naviseerr-client';
import {
    useNaviseerrActions,
    useNaviseerrAddress,
    useNaviseerrStore,
} from '/@/renderer/features/naviseerr/store/naviseerr-store';
import {
    SettingOption,
    SettingsSection,
} from '/@/renderer/features/settings/components/settings-section';
import { Button } from '/@/shared/components/button/button';
import { Group } from '/@/shared/components/group/group';
import { Switch } from '/@/shared/components/switch/switch';
import { TextInput } from '/@/shared/components/text-input/text-input';

export const NaviseerrSettings = memo(() => {
    const { t } = useTranslation('naviseerr');
    const queryClient = useQueryClient();
    const enabled = useNaviseerrStore((state) => state.enabled);
    const savedAddress = useNaviseerrStore((state) => state.address);
    const signedOut = useNaviseerrStore((state) => state.signedOut);
    const address = useNaviseerrAddress();
    const { setAddress, setEnabled } = useNaviseerrActions();
    const [draft, setDraft] = useState(savedAddress);

    const session = useQuery(naviseerrQueries.session(address));
    const status = useQuery({
        ...naviseerrQueries.status(address),
        enabled: !!address && !!session.data,
    });

    const needsSignIn =
        signedOut || (session.data?.mode === 'authentik' && !session.data.authenticated);

    const connection = (() => {
        if (session.isLoading || status.isLoading) return t('settings.checking');
        if (session.error) return session.error.message;
        if (needsSignIn) return t('settings.signedOut');
        if (status.error) return status.error.message;
        return t('settings.connected');
    })();

    const handleTest = () => {
        setAddress(draft);
        queryClient.invalidateQueries({ queryKey: nvsKeys.root(address) });
    };

    const options: SettingOption[] = [
        {
            control: (
                <Switch
                    aria-label={t('settings.enabled')}
                    checked={enabled}
                    onChange={(e) => setEnabled(e.currentTarget.checked)}
                />
            ),
            description: t('settings.enabled_description'),
            title: t('settings.enabled'),
        },
        {
            control: (
                <Group gap="sm" wrap="nowrap">
                    <TextInput
                        aria-label={t('settings.address')}
                        onBlur={() => setAddress(draft)}
                        onChange={(e) => setDraft(e.currentTarget.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleTest()}
                        placeholder="https://naviseerr.example.com"
                        value={draft}
                        width={260}
                    />
                    <Button onClick={handleTest} variant="default">
                        {t('settings.test')}
                    </Button>
                </Group>
            ),
            description: isElectron()
                ? `${t('settings.address_description')} ${t('settings.address_desktop')}`
                : t('settings.address_description'),
            isHidden: !enabled,
            title: t('settings.address'),
        },
        {
            control: needsSignIn ? (
                <Button onClick={() => signIn()} variant="filled">
                    {t('settings.signIn')}
                </Button>
            ) : (
                <></>
            ),
            description: connection,
            isHidden: !address,
            title: t('settings.connection'),
        },
    ];

    return <SettingsSection options={options} title={t('settings.title')} />;
});
