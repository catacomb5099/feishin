// Self-check for map.ts; how to run it is in ../README.md.
import {
    fromNvsId,
    isNvsId,
    toAlbum,
    toNvsId,
    toSong,
    youtubeIdOf,
} from '/@/renderer/features/naviseerr/api/map';

const assert = (ok: boolean, what: string) => {
    if (!ok) throw new Error(`map check failed: ${what}`);
};

const id = 'MPREb_x-Y_1';
assert(fromNvsId(toNvsId(id)) === id, 'prefix round trip');
assert(isNvsId(toNvsId(id)) && !isNvsId(id) && !isNvsId(null), 'prefix detection');
assert(encodeURIComponent(toNvsId(id)) === toNvsId(id), 'id survives a route path');

const song = toSong({
    artistIds: ['UC1', null],
    artists: ['Oasis', 'Guest'],
    durationSeconds: null,
    iconURL: '',
    id: 'dQw4w9WgXcQ',
    name: 'Wonderwall',
    plays: '1.2B plays',
});
assert(song._nvs.plays === '1.2B plays', 'plays text kept as is');
assert(song.duration === null, 'null length stays null');
assert(youtubeIdOf(song) === 'dQw4w9WgXcQ' && song.id === 'nvs~dQw4w9WgXcQ', 'song ids');
assert(song.artists[1].id === 'nvs~' && song.imageUrl === null, 'missing artist id and cover');
const short = { artistIds: [], artists: [], durationSeconds: 61, iconURL: '', id: 'a', name: 'a' };
assert(toSong(short).duration === 61000 && toSong(short, 4).trackNumber === 5, 'ms, position');

const album = toAlbum({
    artistIds: [],
    artists: [],
    iconURL: 'x',
    id,
    name: 'EP',
    playlistId: null,
    trackCount: 2,
    tracks: [
        { durationSeconds: 60, position: 1 },
        { durationSeconds: null, position: 2 },
    ] as never,
    type: 'ALBUM',
    views: null,
    year: 1997,
});
assert(album.duration === 60000 && album.songCount === 2 && album.releaseYear === 1997, 'album');

console.log('map check: ok');
