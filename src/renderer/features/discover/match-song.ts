import type { Song } from '/@/shared/types/domain-types';

const plain = (text: string) =>
    text
        .normalize('NFKD')
        .replace(/\p{M}/gu, '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim();

// A filed song keeps its sharer's title when YouTube Music had no album for it, so "Wonderwall
// (Remastered)" must still count for "Wonderwall": an exact title wins, then one that contains it.
export const matchSong = <T extends Pick<Song, 'artistName' | 'artists' | 'name'>>(
    songs: T[],
    title: string,
    artist?: string,
): T | undefined => {
    const wanted = plain(title);
    const by = artist ? plain(artist) : '';
    const byArtist = songs.filter(
        (song) =>
            !by ||
            [song.artistName, ...song.artists.map((a) => a.name)].some((name) =>
                plain(name ?? '').includes(by),
            ),
    );
    return (
        byArtist.find((song) => plain(song.name) === wanted) ??
        byArtist.find((song) => plain(song.name).includes(wanted))
    );
};
