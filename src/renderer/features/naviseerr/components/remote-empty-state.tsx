import { useTranslation } from 'react-i18next';

import { signIn } from '/@/renderer/features/naviseerr/api/naviseerr-client';
import { useNaviseerrStore } from '/@/renderer/features/naviseerr/store/naviseerr-store';
import { Button } from '/@/shared/components/button/button';
import { Center } from '/@/shared/components/center/center';
import { Icon } from '/@/shared/components/icon/icon';
import { Spinner } from '/@/shared/components/spinner/spinner';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';

/** Loading, signed out, or the server's sentence when a remote page cannot be shown. */
export const RemoteEmptyState = ({
    error,
    loading,
}: {
    error?: Error | null;
    loading?: boolean;
}) => {
    const { t } = useTranslation('naviseerr');
    const signedOut = useNaviseerrStore((state) => state.signedOut);

    if (loading) return <Spinner container />;

    return (
        <Center h="100%" p="xl">
            <Stack align="center" gap="md">
                <Icon color="muted" icon="emptyImage" size="5xl" />
                <Text isMuted ta="center">
                    {signedOut ? t('settings.signedOut') : error?.message || t('page.notFound')}
                </Text>
                {signedOut && <Button onClick={() => signIn()}>{t('settings.signIn')}</Button>}
            </Stack>
        </Center>
    );
};
