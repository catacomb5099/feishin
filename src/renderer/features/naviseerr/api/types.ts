// JSON shapes of the naviseerr server routes Feishin calls (DECISIONS-FEISHIN.md section 2).

export type ActiveDownload = {
    artistIds: (null | string)[];
    artists: string[];
    downloadId: string;
    downloadType: DownloadType;
    failureCode: null | string;
    finishedAt: null | string;
    imageUrl: null | string;
    progressPercent: null | number;
    requestedAt: string;
    songCount: number;
    songsCancelled: number;
    songsFailed: number;
    songsSucceeded: number;
    stage: DownloadStage;
    stageEnteredAt: null | string;
    title: null | string;
    updatedAt: string;
    youtubeId: string;
};

export type ActiveDownloads = {
    downloads: ActiveDownload[];
    pollIntervalMs: number;
    terminalRetentionMs: number;
};

export type Addition = {
    addedAt: null | string;
    additionId: string;
    artists: null | string[];
    downloadId: string;
    durationSeconds: null | number;
    imageUrl: null | string;
    playlistId: string;
    reason: null | string;
    requestedAt: string;
    server: 'JELLYFIN' | 'NAVIDROME';
    state:
        | 'ADDED'
        | 'DOWNLOAD_FAILED'
        | 'GAVE_UP'
        | 'WAITING_FOR_DOWNLOAD'
        | 'WAITING_FOR_MEDIA_SERVER';
    title: null | string;
    youtubeId: string;
};

export type Candidates = {
    candidates: {
        bitrateKbps: null | number;
        extension: string;
        filename: string;
        freeSlot: boolean | null;
        grade: string;
        isCurrent: boolean;
        lengthSeconds: null | number;
        queueLength: null | number;
        size: number;
        uploadSpeed: null | number;
        username: string;
    }[];
    query: null | string;
    reason: null | string;
    status: 'NONE' | 'READY' | 'SEARCHING';
    taskId: string;
};

export type DownloadDetail = {
    download: ActiveDownload;
    songs: {
        artists: string[];
        position: number;
        stage: DownloadStage;
        taskId: string;
        title: null | string;
        youtubeId: string;
    }[];
};

export type DownloadStage =
    | 'DOWNLOADING'
    | 'FAILED'
    | 'PARTIAL_SUCCESS'
    | 'QUEUED'
    | 'READY_TO_DOWNLOAD'
    | 'SEARCHING'
    | 'STARTING'
    | 'SUCCEEDED';

export type DownloadType = 'ALBUM' | 'CURATED' | 'PLAYLIST' | 'RADIO' | 'SONG';

export type LibrarySongState = { downloadId?: string; state: 'IN_LIBRARY' | 'ON_ITS_WAY' };

export type NvsAlbum = {
    artistIds: (null | string)[];
    artists: string[];
    iconURL: string;
    id: string;
    name: string;
    year: number;
};

export type NvsArtist = { iconUrl: string; id: string; name: string };

export type NvsArtistPage = {
    albums: NvsAlbum[];
    description: null | string;
    iconURL: string;
    id: string;
    name: string;
    playlists: NvsPlaylist[];
    similarArtists: NvsArtist[];
    singles: NvsAlbum[];
    subscribers: null | string;
    topSongs: NvsTrack[];
};

export type NvsCollection = {
    artistIds: (null | string)[];
    artists: string[];
    iconURL: string;
    id: string;
    name: string;
    playlistId: null | string;
    trackCount: number;
    tracks: NvsCollectionTrack[];
    type: 'ALBUM' | 'PLAYLIST';
    views: null | string;
    year: null | number;
};

export type NvsCollectionTrack = {
    artistIds: (null | string)[];
    artists: string[];
    durationSeconds: null | number;
    iconURL: string;
    id: string;
    name: string;
    plays: null | string;
    position: number;
};

export type NvsPlaylist = {
    artistIds: (null | string)[];
    artists: string[];
    iconURL: string;
    id: string;
    name: string;
    trackCount: number;
    views: null | string;
};

export type NvsRadio = {
    artists: string[];
    iconURL: string;
    id: string;
    name: string;
    trackCount: number;
    tracks: NvsCollectionTrack[];
};

export type NvsSearch = {
    albums: NvsAlbum[];
    artists: NvsArtist[];
    playlists: NvsPlaylist[];
    tracks: NvsTrack[];
    unavailable?: string[];
};

export type NvsTrack = {
    album?: null | string;
    albumId: string;
    artistIds: (null | string)[];
    artists: string[];
    durationSeconds?: null | number;
    explicit?: boolean | null;
    iconURL: string;
    id: string;
    name: string;
    plays: null | string;
    year: number;
};

export type Session = { authenticated?: boolean; mode: 'authentik' | 'open' };

export type SongInfo = {
    album: null | { id: null | string; name: string };
    artists: { id: null | string; name: string }[];
    credits: { names: string[]; role: string }[];
    durationSeconds: null | number;
    explicit: boolean | null;
    iconURL: string;
    id: string;
    name: string;
    plays: null | string;
    year: null | number;
};

export type Status = {
    library: {
        enabled: boolean;
        mediaServers: { name: string; problem: null | string; url: string }[];
        problem: null | string;
    };
    soulseek: { connected: boolean; loggedIn: boolean };
    youtubeMusic: { detail: null | string; reachable: boolean };
};

export type SuggestedPlaylist = {
    category: string;
    editionDate: string;
    title: string;
    trackCount: number;
    year: null | string;
};

export type SuggestedPlaylistDetail = {
    category: string;
    title: string;
    trackCount: number;
    tracks: {
        artists: string[];
        iconURL: string;
        id: string;
        name: string;
        position: number;
        reason: null | string;
    }[];
};

export const TERMINAL_STAGES: DownloadStage[] = ['SUCCEEDED', 'FAILED', 'PARTIAL_SUCCESS'];
