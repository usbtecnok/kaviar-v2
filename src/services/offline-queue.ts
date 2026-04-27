import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = 'kaviar_offline_queue';
const MAX_ITEMS = 200;
const TTL_MS = 30 * 60 * 1000; // 30 min

export interface QueueItem {
  id: string;
  method: 'POST';
  url: string;
  body: object;
  createdAt: number;
  retries: number;
}

let memoryQueue: QueueItem[] | null = null;
let draining = false;

async function load(): Promise<QueueItem[]> {
  if (memoryQueue) return memoryQueue;
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    memoryQueue = raw ? JSON.parse(raw) : [];
  } catch {
    memoryQueue = [];
  }
  return memoryQueue!;
}

async function persist(): Promise<void> {
  if (!memoryQueue) return;
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(memoryQueue));
  } catch {}
}

export async function enqueue(item: Omit<QueueItem, 'id' | 'createdAt' | 'retries'>): Promise<void> {
  const queue = await load();
  queue.push({
    ...item,
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    retries: 0,
  });
  // Trim oldest if over limit
  if (queue.length > MAX_ITEMS) {
    memoryQueue = queue.slice(-MAX_ITEMS);
  }
  await persist();
}

export async function drain(authToken: string | null): Promise<number> {
  if (draining || !authToken) return 0;
  draining = true;

  try {
    const queue = await load();
    if (queue.length === 0) return 0;

    const now = Date.now();
    // Remove expired items
    memoryQueue = queue.filter(item => now - item.createdAt < TTL_MS);

    let sent = 0;
    const remaining: QueueItem[] = [];

    for (const item of memoryQueue) {
      try {
        const resp = await fetch(item.url, {
          method: item.method,
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify(item.body),
        });
        if (resp.ok || resp.status === 400 || resp.status === 404) {
          // Success or client error (no point retrying) — discard
          sent++;
        } else {
          item.retries++;
          if (item.retries < 5) remaining.push(item);
        }
      } catch {
        // Still offline — keep in queue, stop draining
        remaining.push(item);
        // Push rest without trying
        const idx = memoryQueue.indexOf(item);
        remaining.push(...memoryQueue.slice(idx + 1));
        break;
      }
    }

    memoryQueue = remaining;
    await persist();
    return sent;
  } finally {
    draining = false;
  }
}

export async function getQueueSize(): Promise<number> {
  const queue = await load();
  return queue.length;
}

export async function clearQueue(): Promise<void> {
  memoryQueue = [];
  await AsyncStorage.removeItem(QUEUE_KEY);
}
