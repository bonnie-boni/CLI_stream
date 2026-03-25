import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { MusicAppShell } from '@/components/music-app-shell';
import {
  getDownloadTasks,
  subscribeDownloadTasks,
  type DownloadTask,
} from '../../services/download-state';

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export default function TasksScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const [tasks, setTasks] = useState<DownloadTask[]>(() => getDownloadTasks());

  useEffect(() => {
    return subscribeDownloadTasks((next) => {
      setTasks(next);
    });
  }, []);

  return (
    <MusicAppShell>
      <View style={styles.page}>
        <View style={[styles.container, isWide ? styles.containerWide : null]}>
          <Text style={styles.heading}>Task History</Text>
          <Text style={styles.subheading}>Completed and failed downloads from this session.</Text>

          <View style={styles.listCard}>
            <FlatList
              data={tasks}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <View style={styles.taskRow}>
                  <View style={styles.mainInfo}>
                    <Text numberOfLines={1} style={styles.title}>
                      {item.title}
                    </Text>
                    <Text style={styles.meta}>
                      {item.format} {item.quality}kbps
                    </Text>
                  </View>
                  <View style={styles.statusWrap}>
                    <Text style={styles.status}>{item.status}</Text>
                    <Text style={styles.time}>{formatDate(item.createdAt)}</Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>No tasks yet. Download a song first.</Text>}
            />
          </View>
        </View>
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
  heading: {
    color: '#141722',
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'Georgia',
  },
  subheading: {
    marginTop: 6,
    color: '#575d6d',
    fontSize: 14,
  },
  listCard: {
    flex: 1,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#cdced4',
    backgroundColor: '#efeff2',
  },
  listContent: {
    padding: 8,
    gap: 8,
  },
  taskRow: {
    borderWidth: 1,
    borderColor: '#d7d8de',
    backgroundColor: '#f8f8fb',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  mainInfo: {
    flex: 1,
  },
  title: {
    color: '#171923',
    fontSize: 16,
    fontWeight: '600',
  },
  meta: {
    marginTop: 4,
    color: '#5d6474',
    fontSize: 13,
  },
  statusWrap: {
    minWidth: 120,
    alignItems: 'flex-end',
  },
  status: {
    color: '#1e8e3e',
    fontWeight: '700',
    textTransform: 'uppercase',
    fontSize: 12,
  },
  time: {
    marginTop: 4,
    color: '#6d7382',
    fontSize: 11,
    textAlign: 'right',
  },
  emptyText: {
    paddingVertical: 24,
    textAlign: 'center',
    color: '#5d6474',
  },
});
