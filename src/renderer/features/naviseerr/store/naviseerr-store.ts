import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { createWithEqualityFn } from 'zustand/traditional';

declare global {
    interface Window {
        NAVISEERR_URL?: string;
    }
}

export interface NaviseerrStoreSlice extends NaviseerrStoreState {
    actions: {
        setAddress: (address: string) => void;
        setEnabled: (enabled: boolean) => void;
        setSignedOut: (signedOut: boolean) => void;
    };
}

export interface NaviseerrStoreState {
    address: string;
    enabled: boolean;
    signedOut: boolean;
}

// An unset Docker variable stays as the literal "${NAVISEERR_URL}" text.
const preset = (() => {
    const value = typeof window === 'undefined' ? '' : window.NAVISEERR_URL?.trim() || '';
    return value.startsWith('${') ? '' : value;
})();

export const normalizeAddress = (address: string) => address.trim().replace(/\/+$/, '');

export const useNaviseerrStore = createWithEqualityFn<NaviseerrStoreSlice>()(
    persist(
        devtools(
            immer((set) => ({
                actions: {
                    setAddress: (address) =>
                        set((state) => {
                            state.address = normalizeAddress(address);
                            state.signedOut = false;
                        }),
                    setEnabled: (enabled) =>
                        set((state) => {
                            state.enabled = enabled;
                        }),
                    setSignedOut: (signedOut) =>
                        set((state) => {
                            state.signedOut = signedOut;
                        }),
                },
                address: normalizeAddress(preset),
                enabled: preset !== '',
                signedOut: false,
            })),
            { name: 'store_naviseerr' },
        ),
        {
            name: 'store_naviseerr',
            partialize: (state) => ({ address: state.address, enabled: state.enabled }),
            version: 1,
        },
    ),
);

export const useNaviseerrActions = () => useNaviseerrStore((state) => state.actions);

/** The address while the module is on, else null: every slot renders nothing for null. */
export const useNaviseerrAddress = () =>
    useNaviseerrStore((state) => (state.enabled && state.address ? state.address : null));

export const getNaviseerrAddress = () => {
    const { address, enabled } = useNaviseerrStore.getState();
    return enabled && address ? address : null;
};
