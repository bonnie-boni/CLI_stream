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

export async function searchSongs(query: string, limit = 25): Promise<SongDto[]> {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  const response = await fetch(`${API_BASE}/songs/search?${params.toString()}`);

  if (!response.ok) {
    throw new Error('Failed to search songs');
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
    throw new Error('Download failed');
  }
}

export { API_BASE };
