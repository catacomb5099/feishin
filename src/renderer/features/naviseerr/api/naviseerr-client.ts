import i18n from '/@/i18n/i18n';
import {
    getNaviseerrAddress,
    useNaviseerrStore,
} from '/@/renderer/features/naviseerr/store/naviseerr-store';

export class NaviseerrError extends Error {
    body: any;
    reason: null | string;
    status: number;

    constructor(message: string, status = 0, reason: null | string = null, body: any = null) {
        super(message);
        this.status = status;
        this.reason = reason;
        this.body = body;
    }
}

const unreachable = (address: string) =>
    new NaviseerrError(i18n.t('error.unreachable', { address, ns: 'naviseerr' }));

const isJson = async (url: string) => {
    try {
        const res = await fetch(url, {
            credentials: 'include',
            headers: { Accept: 'application/json' },
        });
        if (!res.ok || !res.headers.get('content-type')?.includes('json')) return false;
        await res.json();
        return true;
    } catch {
        return false;
    }
};

const bases = new Map<string, Promise<string>>();

// Docker install: the web-app container's Caddy is the /api doorway; demo: the server itself.
export const resolveBase = (address: string) => {
    let base = bases.get(address);
    if (!base) {
        base = (async () => {
            if (await isJson(`${address}/api/auth/session`)) return `${address}/api`;
            if (await isJson(`${address}/auth/session`)) return address;
            throw unreachable(address);
        })();
        bases.set(address, base);
        base.catch(() => bases.delete(address));
    }
    return base;
};

interface RequestInit {
    body?: unknown;
    method?: 'DELETE' | 'GET' | 'POST';
    signal?: AbortSignal;
}

export const nvsRequest = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
    const address = getNaviseerrAddress();
    if (!address) throw new NaviseerrError('off');

    const base = await resolveBase(address);
    const hasBody = init.body !== undefined;

    let res: Response;
    try {
        res = await fetch(base + path, {
            body: hasBody ? JSON.stringify(init.body) : undefined,
            credentials: 'include',
            headers: {
                Accept: 'application/json',
                ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
            },
            method: init.method || 'GET',
            signal: init.signal,
        });
    } catch (error) {
        if ((error as Error).name === 'AbortError') throw error;
        throw unreachable(address);
    }

    if (res.status === 401) useNaviseerrStore.getState().actions.setSignedOut(true);

    const data = res.status === 204 ? null : await res.json().catch(() => null);

    if (!res.ok) {
        throw new NaviseerrError(
            data?.message || res.statusText || String(res.status),
            res.status,
            data?.reason ?? null,
            data,
        );
    }

    return data as T;
};

export const signIn = async () => {
    const address = getNaviseerrAddress();
    if (!address) return;
    const base = await resolveBase(address);
    window.location.href = `${base}/auth/authentik/start?to=${encodeURIComponent(window.location.href)}`;
};

export const segment = encodeURIComponent;
