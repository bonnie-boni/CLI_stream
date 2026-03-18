import { Platform } from 'react-native';

export type SongDto = {
  id: string;
  title: string;
  artist: string;
  duration: number;
  webpage_url: string;
  thumbnail: string;
};

type SearchResponse = {
  query: string;
  count: number;
  songs: SongDto[];
  cached?: boolean;
};

type StreamResponse = {
  stream_url: string;
  title: string;
  duration: number;
};

const API_PORT = 8765;
const API_FROM_ENV = process.env.EXPO_PUBLIC_API_BASE_URL;

function resolveApiBaseUrl() {
  if (API_FROM_ENV?.trim()) {
    return API_FROM_ENV.trim();
  }

  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${API_PORT}`;
  }

  return `http://127.0.0.1:${API_PORT}`;
}

const API_BASE = resolveApiBaseUrl();

export async function searchSongs(query: string, limit = 20, signal?: AbortSignal): Promise<SongDto[]> {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  const response = await fetch(`${API_BASE}/songs/search?${params.toString()}`, { signal });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || 'Failed to search songs');
  }

  const data = (await response.json()) as SearchResponse;
  return data.songs ?? [];
}

export async function getPreloadedSongs(signal?: AbortSignal): Promise<SongDto[]> {
  const response = await fetch(`${API_BASE}/songs/preloaded`, { signal });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || 'Failed to load preloaded songs');
  }

  const data = (await response.json()) as SearchResponse;
  return data.songs ?? [];
}

export async function downloadSong(song: SongDto): Promise<void> {
  const response = await fetch(`${API_BASE}/songs/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: song.id,
      title: song.title,
      webpage_url: song.webpage_url,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || 'Download failed');
  }
}

export async function getSongStream(songUrl: string): Promise<StreamResponse> {
  const params = new URLSearchParams({ url: songUrl });
  const response = await fetch(`${API_BASE}/songs/stream?${params.toString()}`);

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || 'Failed to resolve stream URL');
  }

  return (await response.json()) as StreamResponse;
}

export { API_BASE };
