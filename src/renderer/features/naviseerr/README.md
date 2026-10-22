# Downloads (naviseerr module)

Feishin only plays what your Navidrome or Jellyfin already has. This module adds the missing half: find music
you do not have (YouTube Music, through a [naviseerr](https://github.com/catacomb5099/naviseerr) server), download
it into your library, and put it in your playlists. Everything is built from Feishin's own components.

Everything lives in this folder. Upstream files only import from `index.ts`, and every export renders nothing (or
does nothing) while the module is off, so switched off Feishin behaves exactly as upstream. That makes the folder
the boundary of a future plugin.

## Turn it on or off

- Settings -> General -> **Downloads**: the switch "Find and download music you don't have" and the server address.
- Docker: `NAVISEERR_URL=https://naviseerr.example.com` presets the address and turns the switch on, on a browser
  that never changed it.
- The naviseerr server must allow this Feishin's address: `AUTH_ALLOWED_ORIGINS=https://feishin.example.com` on the
  server (exact scheme, host and port). With naviseerr's login on, "Sign in" in the same section signs in through
  the server (a cookie); Feishin never sees a password or token.
- Web build only for now: the desktop app (`file://`) gets no login cookie.

## Touch points (the whole fork diff outside this folder)

| # | Upstream file | Change |
|---|---|---|
| T5 | `features/settings/components/general/general-tab.tsx` | one section entry `NaviseerrSettings` |
| T6 | `settings.js.template` | `window.NAVISEERR_URL = "${NAVISEERR_URL}";` |

## Layout

- `api/` the server's JSON shapes (`types.ts`), one fetch client (`naviseerr-client.ts`: finds the base address,
  sends the login cookie, turns errors into one sentence) and React Query options (`naviseerr-api.ts`, keys start
  with `['naviseerr', address]`).
- `store/` the persisted switch and address (`store_naviseerr`).
- `components/` the module's screens and parts.
- `i18n/en.json` the strings, registered as the `naviseerr` namespace (Feishin's `en.json` is untouched).
