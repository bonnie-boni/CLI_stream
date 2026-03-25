import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { MusicAppShell } from '@/components/music-app-shell';
import { downloadSong, type DownloadFormat, type SongDto } from '@/services/music-api';
import { addDownloadTask } from '../../services/download-state';

const QUALITIES = [320, 256, 192, 128, 64] as const;

function toSong(params: Record<string, string | string[] | undefined>): SongDto | null {
  const id = typeof params.id === 'string' ? params.id : '';
  const title = typeof params.title === 'string' ? params.title : '';
  const artist = typeof params.artist === 'string' ? params.artist : 'Unknown Artist';
  const duration = typeof params.duration === 'string' ? Number(params.duration) : 0;
  const webpage_url = typeof params.webpage_url === 'string' ? params.webpage_url : '';
  const thumbnail = typeof params.thumbnail === 'string' ? params.thumbnail : '';

  if (!id || !title || !webpage_url) {
    return null;
  }

  return {
    id,
    title,
    artist,
    duration: Number.isFinite(duration) ? duration : 0,
    webpage_url,
    thumbnail,
  };
}

export default function DownloadScreen() {
  const params = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const scale = width >= 900 ? 1.1 : width >= 640 ? 1 : 0.85;

  const song = useMemo(() => toSong(params), [params]);
  const [format, setFormat] = useState<DownloadFormat>('mp3');
  const [activeQuality, setActiveQuality] = useState<number>(192);
  const [isTaskOpen, setIsTaskOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle');
  const [lastError, setLastError] = useState('');

  const startDownload = async (quality: number) => {
    if (!song) {
      return;
    }

    setActiveQuality(quality);
    setLastError('');
    setProgress(4);
    setStatus('starting');
    setIsTaskOpen(true);

    let current = 4;
    const timer = setInterval(() => {
      current = Math.min(90, current + 7);
      setProgress(current);
    }, 280);

    try {
      const result = await downloadSong(song, {
        format,
        quality,
      });
      clearInterval(timer);
      setProgress(100);
      setStatus('ok');
      addDownloadTask({
        id: `${Date.now()}-${song.id}`,
        title: song.title,
        format: result.format.toUpperCase(),
        quality: result.quality,
        status: result.status,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      clearInterval(timer);
      setStatus('failed');
      setProgress(100);
      setLastError(err instanceof Error ? err.message : 'Download failed');
    }
  };

  return (
    <MusicAppShell>
      <View style={styles.page}>
        <View style={[styles.container, isWide ? styles.containerWide : null]}>
          <View style={styles.headerCard}>
            <Text numberOfLines={2} style={styles.songTitle}>
              {song?.title || 'Pick a song from Search first'}
            </Text>
            <Text style={styles.songSub}>Choose format and quality, then tap download.</Text>
          </View>

          <View style={styles.segmentWrap}>
            <Pressable
              style={[styles.segmentButton, format === 'mp3' ? styles.segmentButtonActive : null]}
              onPress={() => setFormat('mp3')}>
              <Text style={[styles.segmentText, format === 'mp3' ? styles.segmentTextActive : null]}>MP3</Text>
            </Pressable>
            <Pressable
              style={[styles.segmentButton, format === 'mp4' ? styles.segmentButtonActive : null]}
              onPress={() => setFormat('mp4')}>
              <Text style={[styles.segmentText, format === 'mp4' ? styles.segmentTextActive : null]}>MP4</Text>
            </Pressable>
          </View>

          <View style={styles.tableWrap}>
            <View style={styles.tableHead}>
              <Text style={[styles.headText, { fontSize: 16 * scale }]}>QUALITY</Text>
              <Text style={[styles.headText, { fontSize: 16 * scale }]}>FORMAT</Text>
              <Text style={[styles.headText, { fontSize: 16 * scale }]}>ACTION</Text>
            </View>

            {QUALITIES.map((quality) => (
              <View key={quality} style={styles.tableRow}>
                <Text style={[styles.qualityText, { fontSize: 18 * scale }]}>{quality}kbps</Text>
                <Text style={[styles.formatText, { fontSize: 18 * scale }]}>{format.toUpperCase()}</Text>
                <Pressable
                  style={[styles.downloadButton, activeQuality === quality ? styles.downloadButtonActive : null]}
                  onPress={() => startDownload(quality)}
                  disabled={!song}>
                  <MaterialIcons name="download" size={20} color="#131720" />
                </Pressable>
              </View>
            ))}
          </View>

          {lastError ? <Text style={styles.errorText}>{lastError}</Text> : null}
        </View>

        <Modal animationType="fade" visible={isTaskOpen} transparent onRequestClose={() => setIsTaskOpen(false)}>
          <View style={styles.modalScrim}>
            <View style={styles.modalCard}>
              <View style={styles.modalTop}>
                <Text style={[styles.modalTitle, { fontSize: 28 * scale }]}>Task overview</Text>
                <Pressable onPress={() => setIsTaskOpen(false)}>
                  <MaterialIcons name="close" size={22} color="#131720" />
                </Pressable>
              </View>

              <Text style={[styles.modalLine, { fontSize: 18 * scale }]}>Format: {format.toUpperCase()} {activeQuality}kbps</Text>
              <Text style={[styles.modalLine, { fontSize: 18 * scale }]}>Status: {status === 'ok' ? 'ok' : status}</Text>

              <Text style={[styles.percentText, { fontSize: 24 * scale }]}>{Math.round(progress)}%</Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressBar, { width: `${progress}%` }]} />
              </View>

              <View style={styles.modalActions}>
                <Pressable style={styles.modalDownloadButton} onPress={() => setIsTaskOpen(false)}>
                  <Text style={styles.modalDownloadText}>DOWNLOAD</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </MusicAppShell>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#e7e7ea',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 860,
    alignSelf: 'center',
  },
  containerWide: {
    paddingTop: 8,
  },
  headerCard: {
    borderWidth: 1,
    borderColor: '#cdced4',
    backgroundColor: '#f0f0f3',
    padding: 12,
    borderRadius: 2,
  },
  songTitle: {
    color: '#161922',
    fontSize: 20,
    fontWeight: '700',
  },
  songSub: {
    marginTop: 4,
    color: '#616675',
  },
  segmentWrap: {
    marginTop: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  segmentButton: {
    minWidth: 76,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d179ba',
    backgroundColor: '#f0f0f3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonActive: {
    backgroundColor: '#5666ff',
    borderColor: '#5666ff',
  },
  segmentText: {
    color: '#7f8190',
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Georgia',
  },
  segmentTextActive: {
    color: '#ffffff',
  },
  tableWrap: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#cdced4',
    backgroundColor: '#efeff2',
  },
  tableHead: {
    height: 42,
    borderBottomWidth: 1,
    borderBottomColor: '#d6d7dd',
    backgroundColor: '#d8d9de',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headText: {
    width: '33%',
    textAlign: 'center',
    color: '#171923',
    fontWeight: '700',
    fontFamily: 'Georgia',
  },
  tableRow: {
    height: 62,
    borderBottomWidth: 1,
    borderBottomColor: '#d6d7dd',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  qualityText: {
    width: '33%',
    textAlign: 'center',
    color: '#171923',
    fontFamily: 'Georgia',
  },
  formatText: {
    width: '33%',
    textAlign: 'center',
    color: '#7b7f8d',
    fontFamily: 'Georgia',
  },
  downloadButton: {
    width: 42,
    height: 42,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#2e89ee',
    backgroundColor: '#f7f8fb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadButtonActive: {
    borderColor: '#22a5ad',
  },
  errorText: {
    marginTop: 10,
    color: '#b42318',
  },
  modalScrim: {
    flex: 1,
    backgroundColor: 'rgba(28, 30, 38, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  modalCard: {
    width: '100%',
    maxWidth: 640,
    borderRadius: 8,
    backgroundColor: '#f8f8fb',
    padding: 18,
  },
  modalTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    color: '#161922',
    fontWeight: '700',
    fontFamily: 'Georgia',
  },
  modalLine: {
    marginTop: 14,
    color: '#262a34',
    fontFamily: 'Georgia',
  },
  percentText: {
    marginTop: 20,
    textAlign: 'right',
    color: '#8a91a2',
    fontFamily: 'Georgia',
  },
  progressTrack: {
    marginTop: 6,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#d7dae0',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: '#31bd63',
  },
  modalActions: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  modalDownloadButton: {
    minWidth: 128,
    height: 42,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#3f66ff',
    backgroundColor: '#f7f8fb',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  modalDownloadText: {
    color: '#11131a',
    fontWeight: '700',
    letterSpacing: 0.8,
  },
});
