import type { MatchRoom } from '../types';

export interface OutboxItem {
  id: string;
  roomCode: string;
  endpoint: string; // e.g. '/score', '/goal', '/undo'
  payload: any;
  seq: number;
  timestamp: number;
  attempts: number;
}

export type SyncStatus = 'live' | 'syncing' | 'offline';

const STORAGE_PREFIX = 'kc_outbox_';
const statusListeners = new Set<(status: SyncStatus, pendingCount: number) => void>();

let isProcessing = false;
let retryTimeout: any = null;

function getStorageKey(roomCode: string): string {
  return `${STORAGE_PREFIX}${roomCode.trim().toUpperCase()}`;
}

export function getOutbox(roomCode: string): OutboxItem[] {
  try {
    const raw = localStorage.getItem(getStorageKey(roomCode));
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed reading outbox:', err);
    return [];
  }
}

export function saveOutbox(roomCode: string, items: OutboxItem[]): void {
  try {
    localStorage.setItem(getStorageKey(roomCode), JSON.stringify(items));
    notifyListeners(roomCode);
  } catch (err) {
    console.error('Failed saving outbox:', err);
  }
}

export function clearOutbox(roomCode: string): void {
  try {
    localStorage.removeItem(getStorageKey(roomCode));
    notifyListeners(roomCode);
  } catch (err) {
    console.error('Failed clearing outbox:', err);
  }
}

export function getNextOutboxSeq(roomCode: string, serverRevision: number): number {
  const items = getOutbox(roomCode);
  if (items.length === 0) return serverRevision + 1;
  const maxSeq = Math.max(...items.map((i) => i.seq));
  return Math.max(maxSeq + 1, serverRevision + 1);
}

export function enqueueAction(item: OutboxItem): void {
  const items = getOutbox(item.roomCode);
  // Prevent duplicate enqueue
  if (!items.find((i) => i.id === item.id)) {
    items.push(item);
    saveOutbox(item.roomCode, items);
  }
  triggerProcess(item.roomCode);
}

function notifyListeners(roomCode: string) {
  const items = getOutbox(roomCode);
  const count = items.length;
  const isOnline = navigator.onLine;

  let status: SyncStatus = 'live';
  if (!isOnline) {
    status = 'offline';
  } else if (count > 0 || isProcessing) {
    status = 'syncing';
  }

  statusListeners.forEach((listener) => listener(status, count));
}

export function subscribeSyncStatus(
  listener: (status: SyncStatus, pendingCount: number) => void
): () => void {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
}

export function triggerProcess(roomCode: string, onUpdate?: (room: MatchRoom) => void): void {
  if (isProcessing) return;
  if (!navigator.onLine) {
    notifyListeners(roomCode);
    return;
  }

  clearTimeout(retryTimeout);
  processQueue(roomCode, onUpdate);
}

async function processQueue(
  roomCode: string,
  onUpdate?: (room: MatchRoom) => void
): Promise<void> {
  if (isProcessing) return;
  const items = getOutbox(roomCode);
  if (items.length === 0) {
    notifyListeners(roomCode);
    return;
  }

  isProcessing = true;
  notifyListeners(roomCode);

  const cleanCode = roomCode.trim().toUpperCase();
  const item = items[0]; // strictly FIFO sequential

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
  const url = `${API_URL}/rooms/${cleanCode}${item.endpoint}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item.payload),
    });

    const data = await res.json();

    if (res.ok || data.idempotent) {
      // Succeeded or idempotent -> remove from outbox
      const remaining = getOutbox(cleanCode).filter((i) => i.id !== item.id);
      saveOutbox(cleanCode, remaining);
      isProcessing = false;

      if (data.room && onUpdate) {
        onUpdate(data.room);
      }

      // Process next item immediately
      if (remaining.length > 0) {
        processQueue(cleanCode, onUpdate);
      } else {
        notifyListeners(cleanCode);
      }
      return;
    }

    if (data.code === 'GAP_IN_SEQUENCE') {
      // Re-align sequence from expectedSeq
      item.payload.seq = data.expectedSeq;
      item.seq = data.expectedSeq;
      saveOutbox(cleanCode, items);
      isProcessing = false;
      retryTimeout = setTimeout(() => triggerProcess(cleanCode, onUpdate), 1000);
      return;
    }

    // Permanent business failure (e.g. MATCH_FINISHED, NOT_YOUR_TEAM) -> drop item to prevent blocking queue
    if (res.status === 400 || res.status === 403) {
      console.warn('Dropping rejected queued action:', item, data.error);
      const remaining = getOutbox(cleanCode).filter((i) => i.id !== item.id);
      saveOutbox(cleanCode, remaining);
      isProcessing = false;

      window.dispatchEvent(
        new CustomEvent('kc_outbox_rejected', {
          detail: { item, error: data.error || 'Action rejected by server' },
        })
      );

      if (remaining.length > 0) {
        processQueue(cleanCode, onUpdate);
      } else {
        notifyListeners(cleanCode);
      }
      return;
    }

    // Network / 5xx error -> exponential backoff
    item.attempts = (item.attempts || 0) + 1;
    saveOutbox(cleanCode, items);
    isProcessing = false;
    const delay = Math.min(30000, Math.pow(2, item.attempts) * 1000);
    retryTimeout = setTimeout(() => triggerProcess(cleanCode, onUpdate), delay);
  } catch (networkErr) {
    // Offline or connection dropped
    item.attempts = (item.attempts || 0) + 1;
    saveOutbox(cleanCode, items);
    isProcessing = false;
    notifyListeners(cleanCode);

    const delay = Math.min(30000, Math.pow(2, item.attempts) * 1000);
    retryTimeout = setTimeout(() => triggerProcess(cleanCode, onUpdate), delay);
  }
}

// Global online / offline listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    // Process all rooms stored in localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        const code = key.replace(STORAGE_PREFIX, '');
        triggerProcess(code);
      }
    }
  });

  window.addEventListener('offline', () => {
    statusListeners.forEach((listener) => listener('offline', 0));
  });
}
