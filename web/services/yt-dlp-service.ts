import { Platform } from 'react-native';

export type YtDlpSong = {
  id: string;
  title: string;
  artist: string;
  duration: number;
  webpage_url: string;
  thumbnail: string;
};

/**
 * In browser environments, we cannot directly run yt-dlp.
 * This service acts as a wrapper for future Node.js server-side integration.
 * Currently, use the backend API or music-api service instead.
 */

/**
 * Search for songs. In web environment, use the backend API.
 * This is a placeholder for future direct yt-dlp integration.
 */
export async function searchWithYtDlp(
  query: string,
  limit: number = 20,
): Promise<YtDlpSong[]> {
  if (Platform.OS !== 'web') {
    throw new Error('yt-dlp search is only supported in web environment');
  }

  console.warn(
    'Direct yt-dlp in browser is not supported. Use the backend API server or music-api service instead.',
  );

  return [];
}

/**
 * Download a song using yt-dlp with specified format and quality.
 * This requires a Node.js backend server.
 */
export async function downloadWithYtDlp(
  url: string,
  options: {
    format: 'mp3' | 'mp4';
    quality: number;
    outputPath?: string;
  },
): Promise<{ status: string; filename: string }> {
  if (Platform.OS !== 'web') {
    throw new Error('yt-dlp download is only supported in web command environments');
  }

  console.warn(
    'Web downloads require a backend API server. Ensure the backend service is running on port 8765.',
  );

  return {
    status: 'queued',
    filename: 'download',
  };
}
