export type DownloadTask = {
  id: string;
  title: string;
  format: string;
  quality: number;
  status: string;
  createdAt: string;
};

type Listener = (tasks: DownloadTask[]) => void;

const tasks: DownloadTask[] = [];
const listeners = new Set<Listener>();

function emit() {
  const snapshot = [...tasks];
  listeners.forEach((listener) => {
    listener(snapshot);
  });
}

export function addDownloadTask(task: DownloadTask) {
  tasks.unshift(task);
  emit();
}

export function getDownloadTasks(): DownloadTask[] {
  return [...tasks];
}

export function subscribeDownloadTasks(listener: Listener): () => void {
  listeners.add(listener);
  listener([...tasks]);

  return () => {
    listeners.delete(listener);
  };
}
