import { Platform } from 'react-native';

export type SongDto = {
  id: string;
  title: string;
  artist: string;
  duration: number;
  webpage_url: string;
  thumbnail: string;
};

export type DownloadFormat = 'mp3' | 'mp4';

export type DownloadResult = {
  status: string;
  title: string;
  downloads_dir: string;
  format: DownloadFormat;
  quality: number;
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

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  );
}

function backendUnavailableMessage(action: string): string {
  return `${action} requires the CLI Music backend at ${API_BASE}. Start it with: python -m cli_music.api`;
}

async function extractErrorMessage(response: Response, fallback: string): Promise<string> {
  const text = await response.text();
  if (!text) {
    return fallback;
  }

  try {
    const json = JSON.parse(text) as { detail?: string };
    return json.detail || text;
  } catch {
    return text;
  }
}

const API_PORT = 8765;
const API_FROM_ENV = process.env.EXPO_PUBLIC_API_BASE_URL;

/**
 * Mock songs for demo/offline mode.
 * Used when API is unavailable.
 */
const MOCK_SONGS: SongDto[] = [
  {
    id: 'demo-1',
    title: 'Easy On Me (Official Vi)',
    artist: 'Adele',
    duration: 210,
    webpage_url: 'https://www.youtube.com/watch?v=demo1',
    thumbnail:
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'demo-2',
    title: 'Unholy (feat.Kim Petras)',
    artist: 'Sam Smith',
    duration: 195,
    webpage_url: 'https://www.youtube.com/watch?v=demo2',
    thumbnail:
      'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=600&q=80',
  },
];

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

/**
 * Search for songs. Falls back to mock data if API unavailable.
 */
export async function searchSongs(query: string, limit = 20, signal?: AbortSignal): Promise<SongDto[]> {
  if (!query.trim()) {
    return [];
  }

  try {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    const response = await fetch(`${API_BASE}/songs/search?${params.toString()}`, { signal });

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response, 'Search failed'));
    }

    const data = (await response.json()) as SearchResponse;
    return data.songs ?? [];
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    console.warn('Search API unavailable, using demo data:', error);
    // Return mock data when API is unavailable
    return MOCK_SONGS.slice(0, limit);
  }
}

/**
 * Get preloaded songs for quick startup.
 */
export async function getPreloadedSongs(signal?: AbortSignal): Promise<SongDto[]> {
  try {
    const response = await fetch(`${API_BASE}/songs/preloaded`, { signal });

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response, 'Failed to load preloaded songs'));
    }

    const data = (await response.json()) as SearchResponse;
    return data.songs ?? [];
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    console.warn('Preloaded API unavailable, using demo data:', error);
    return MOCK_SONGS;
  }
}

/**
 * Download a song with specified format and quality.
 * Requires backend API server running.
 */
export async function downloadSong(
  song: SongDto,
  options: { format: DownloadFormat; quality: number },
): Promise<DownloadResult> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/songs/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: song.id,
        title: song.title,
        webpage_url: song.webpage_url,
        format: options.format,
        quality: options.quality,
      }),
    });
  } catch (error) {
    throw new Error(backendUnavailableMessage('Download/conversion'));
  }

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, 'Download failed'));
  }

  return (await response.json()) as DownloadResult;
}

/**
 * Get streaming URL for a song.
 */
export async function getSongStream(songUrl: string): Promise<StreamResponse> {
  const params = new URLSearchParams({ url: songUrl });
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/songs/stream?${params.toString()}`);
  } catch (error) {
    throw new Error(backendUnavailableMessage('Streaming'));
  }

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, 'Failed to resolve stream URL'));
  }

  return (await response.json()) as StreamResponse;
}

export { API_BASE };
