import {
    NvsAlbum,
    NvsArtist,
    NvsCollection,
    NvsCollectionTrack,
    NvsPlaylist,
    NvsTrack,
} from '/@/renderer/features/naviseerr/api/types';
import {
    Album,
    AlbumArtist,
    ExplicitStatus,
    LibraryItem,
    Playlist,
    RelatedArtist,
    ServerType,
    Song,
} from '/@/shared/types/domain-types';

// No Navidrome, Jellyfin or Subsonic id starts with this; YouTube ids are letters, digits, '-' and '_'.
export const NVS_PREFIX = 'nvs~';

export const toNvsId = (youtubeId: string) => NVS_PREFIX + youtubeId;

// A suggested playlist ("Made for you") is a playlist page too: nvs~c~<curator category>.
export const CURATED_PREFIX = 'c~';
export const curatedCategory = (id: string) =>
    id.startsWith(CURATED_PREFIX) ? id.slice(CURATED_PREFIX.length) : null;
export const isNvsId = (id?: null | string): id is string => !!id && id.startsWith(NVS_PREFIX);
export const fromNvsId = (id: string) => (isNvsId(id) ? id.slice(NVS_PREFIX.length) : id);

/** What the module keeps on a mapped song besides Feishin's own fields. */
export type NvsSongExtra = { _nvs: { plays: null | string; youtubeId: string } };
export type RemoteSong = NvsSongExtra & Song;

export const youtubeIdOf = (song: Song) => (song as Partial<RemoteSong>)._nvs?.youtubeId ?? null;

const base = { _serverId: 'naviseerr', _serverType: ServerType.SUBSONIC };

export const toRelatedArtists = (names: string[], ids: (null | string)[]): RelatedArtist[] =>
    names.map((name, index) => ({
        // An artist YouTube gave no channel id for still needs a non-empty id for Feishin's links.
        id: toNvsId(ids[index] || ''),
        imageId: null,
        imageUrl: null,
        name,
        userFavorite: false,
        userRating: null,
    }));

type TrackLike = Partial<NvsCollectionTrack & NvsTrack> &
    Pick<NvsTrack, 'artistIds' | 'artists' | 'iconURL' | 'id' | 'name'>;

export const toSong = (track: TrackLike, index = 0): RemoteSong => {
    const artists = toRelatedArtists(track.artists, track.artistIds);
    const seconds = track.durationSeconds;
    return {
        ...base,
        _itemType: LibraryItem.SONG,
        _nvs: { plays: track.plays ?? null, youtubeId: track.id },
        album: track.album ?? null,
        albumArtistName: track.artists.join(', '),
        albumArtists: artists,
        albumId: track.albumId ? toNvsId(track.albumId) : '',
        artistName: track.artists.join(', '),
        artists,
        bitDepth: null,
        bitRate: 0,
        blurHash: null,
        bpm: null,
        channels: null,
        codec: null,
        comment: null,
        compilation: null,
        container: null,
        createdAt: '',
        date: null,
        discNumber: 1,
        discSubtitle: null,
        // Feishin counts milliseconds; null keeps the length cell blank.
        duration: (typeof seconds === 'number' ? seconds * 1000 : null) as number,
        explicitStatus: track.explicit ? ExplicitStatus.EXPLICIT : null,
        folderId: null,
        gain: null,
        genres: [],
        id: toNvsId(track.id),
        imageId: null,
        imageUrl: track.iconURL || null,
        lastPlayedAt: null,
        libraryId: null,
        libraryName: null,
        lyrics: null,
        mbzAlbumId: null,
        mbzAlbumType: null,
        mbzRecordingId: null,
        mbzReleaseGroupId: null,
        mbzTrackId: null,
        missing: null,
        name: track.name,
        originalDate: null,
        originalYear: null,
        participants: null,
        path: null,
        peak: null,
        playCount: 0,
        releaseDate: null,
        releaseYear: track.year || null,
        sampleRate: null,
        size: 0,
        sortName: track.name,
        tags: null,
        thumbHash: null,
        trackNumber: track.position ?? index + 1,
        trackSubtitle: null,
        updatedAt: '',
        userFavorite: false,
        userRating: null,
        year: track.year || null,
    };
};

export const toAlbum = (album: NvsAlbum | NvsCollection): Album => {
    const artists = toRelatedArtists(album.artists, album.artistIds);
    const tracks = 'tracks' in album ? album.tracks : null;
    const seconds = tracks?.reduce((sum, track) => sum + (track.durationSeconds ?? 0), 0);
    return {
        ...base,
        _itemType: LibraryItem.ALBUM,
        albumArtistName: album.artists.join(', '),
        albumArtists: artists,
        artists,
        blurHash: null,
        comment: null,
        createdAt: '',
        discs: null,
        dominantColor: null,
        duration: seconds ? seconds * 1000 : null,
        explicitStatus: null,
        gain: null,
        genres: [],
        id: toNvsId(album.id),
        imageId: null,
        imageUrl: album.iconURL || null,
        isCompilation: null,
        lastPlayedAt: null,
        mbzId: null,
        mbzReleaseGroupId: null,
        missing: null,
        name: album.name,
        originalDate: null,
        originalYear: null,
        participants: null,
        peak: null,
        playCount: null,
        ratedAt: null,
        recordLabels: [],
        releaseDate: null,
        releaseType: null,
        releaseTypes: [],
        releaseYear: album.year || null,
        size: null,
        songCount: tracks ? tracks.length : null,
        sortName: album.name,
        starredAt: null,
        tags: null,
        thumbHash: null,
        trackYearRange: null,
        updatedAt: '',
        userFavorite: false,
        userRating: null,
        version: null,
    };
};

export const toAlbumArtist = (artist: NvsArtist): AlbumArtist => ({
    ...base,
    _itemType: LibraryItem.ALBUM_ARTIST,
    albumCount: null,
    biography: null,
    blurHash: null,
    dominantColor: null,
    duration: null,
    genres: [],
    id: toNvsId(artist.id),
    imageId: null,
    imageUrl: artist.iconUrl || null,
    lastPlayedAt: null,
    mbz: null,
    missing: null,
    name: artist.name,
    playCount: null,
    ratedAt: null,
    similarArtists: null,
    songCount: null,
    starredAt: null,
    thumbHash: null,
    userFavorite: false,
    userRating: null,
});

export const toPlaylist = (playlist: NvsPlaylist): Playlist => ({
    ...base,
    _itemType: LibraryItem.PLAYLIST,
    blurHash: null,
    description: playlist.views,
    dominantColor: null,
    duration: null,
    evaluatedAt: null,
    genres: [],
    id: toNvsId(playlist.id),
    imageId: null,
    imageUrl: playlist.iconURL || null,
    name: playlist.name,
    owner: playlist.artists.join(', ') || null,
    ownerId: null,
    public: true,
    size: null,
    songCount: playlist.trackCount || null,
    thumbHash: null,
});
