// Imported by Feishin's settings store directly (not through index.ts), which would make an import cycle.
import { useMemo } from 'react';

import i18n from '/@/i18n/i18n';
import { useNaviseerrAddress } from '/@/renderer/features/naviseerr/store/naviseerr-store';

export const NAVISEERR_DOWNLOADS_ROUTE = '/naviseerr/downloads';

/** Feishin's sidebar items plus one constant "Downloads" entry while the module is on. */
export const useWithDownloadsItem = <
    T extends { disabled: boolean; id: string; label: string; route: string },
>(
    items: T[],
) => {
    const on = !!useNaviseerrAddress();
    return useMemo(
        () =>
            on
                ? [
                      ...items,
                      {
                          disabled: false,
                          id: 'Downloads',
                          label: i18n.t('downloads.title', { ns: 'naviseerr' }),
                          route: NAVISEERR_DOWNLOADS_ROUTE,
                      } as T,
                  ]
                : items,
        [items, on],
    );
};
