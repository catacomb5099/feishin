import { queryOptions } from '@tanstack/react-query';

import { nvsRequest } from '/@/renderer/features/naviseerr/api/naviseerr-client';
import { Session, Status } from '/@/renderer/features/naviseerr/api/types';

// Keys start with 'naviseerr' and the address, never a Feishin serverId: it is another server.
export const nvsKeys = {
    root: (address: null | string) => ['naviseerr', address] as const,
};

export const naviseerrQueries = {
    session: (address: null | string) =>
        queryOptions({
            enabled: !!address,
            queryFn: ({ signal }) => nvsRequest<Session>('/auth/session', { signal }),
            queryKey: [...nvsKeys.root(address), 'session'],
            retry: false,
        }),
    status: (address: null | string) =>
        queryOptions({
            enabled: !!address,
            queryFn: ({ signal }) => nvsRequest<Status>('/status', { signal }),
            queryKey: [...nvsKeys.root(address), 'status'],
            retry: false,
            staleTime: 60_000,
        }),
};
