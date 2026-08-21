import { openDB, type IDBPDatabase } from 'idb';
import type { Conversation, ExportData } from '@/lib/types';

const DB_NAME = 'shadow-db';
const DB_VERSION = 2;

interface ShadowDB {
  conversations: {
    key: string;
    value: Conversation;
    indexes: { 'by-updated': number };
  };
  settings: {
    key: string;
    value: unknown;
  };
  artifacts: {
    key: string;
    value: import('@/lib/types').Artifact;
    indexes: { 'by-conversation': string };
  };
}

let dbPromise: Promise<IDBPDatabase<ShadowDB>> | null = null;

function getDB(): Promise<IDBPDatabase<ShadowDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ShadowDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Conversations store
        if (!db.objectStoreNames.contains('conversations')) {
          const convStore = db.createObjectStore('conversations', {
            keyPath: 'id',
          });
          convStore.createIndex('by-updated', 'updatedAt');
        }
        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
        // Artifacts store
        if (!db.objectStoreNames.contains('artifacts')) {
          const artifactStore = db.createObjectStore('artifacts', {
            keyPath: 'id',
          });
          artifactStore.createIndex('by-conversation', 'conversationId');
        }
      },
    });
  }
  return dbPromise;
}

// --- Conversations ---

export async function getAllConversations(): Promise<Conversation[]> {
  const db = await getDB();
  const convs = await db.getAllFromIndex('conversations', 'by-updated');
  return convs.reverse(); // newest first
}

export async function getConversation(
  id: string
): Promise<Conversation | undefined> {
  const db = await getDB();
  return db.get('conversations', id);
}

export async function saveConversation(conv: Conversation): Promise<void> {
  const db = await getDB();
  await db.put('conversations', conv);
}

export async function deleteConversation(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('conversations', id);
}

export async function clearAllConversations(): Promise<void> {
  const db = await getDB();
  await db.clear('conversations');
}

export async function searchConversations(
  query: string
): Promise<Conversation[]> {
  const all = await getAllConversations();
  if (!query.trim()) return all;
  const lower = query.toLowerCase();
  return all.filter(
    (c) =>
      c.title.toLowerCase().includes(lower) ||
      c.messages.some((m) =>
        m.content.some(
          (mc) => mc.type === 'text' && mc.text?.toLowerCase().includes(lower)
        )
      )
  );
}

// --- Artifacts ---

export async function getArtifact(id: string): Promise<import('@/lib/types').Artifact | undefined> {
  const db = await getDB();
  return db.get('artifacts', id);
}

export async function saveArtifact(artifact: import('@/lib/types').Artifact): Promise<void> {
  const db = await getDB();
  await db.put('artifacts', artifact);
}

export async function getArtifactsByConversation(conversationId: string): Promise<import('@/lib/types').Artifact[]> {
  const db = await getDB();
  return db.getAllFromIndex('artifacts', 'by-conversation', conversationId);
}

// --- Settings ---

export async function getSetting<T>(key: string): Promise<T | undefined> {
  const db = await getDB();
  return db.get('settings', key) as Promise<T | undefined>;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  const db = await getDB();
  await db.put('settings', value, key);
}

export async function clearSettings(): Promise<void> {
  const db = await getDB();
  await db.clear('settings');
}

// --- Export / Import ---

export async function exportConversations(): Promise<ExportData> {
  const conversations = await getAllConversations();
  return {
    version: 1,
    exportedAt: Date.now(),
    conversations,
  };
}

export function validateImportData(data: unknown): data is ExportData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  if (typeof d.version !== 'number') return false;
  if (!Array.isArray(d.conversations)) return false;
  // Validate each conversation has required fields
  for (const conv of d.conversations) {
    if (!conv || typeof conv !== 'object') return false;
    const c = conv as Record<string, unknown>;
    if (typeof c.id !== 'string') return false;
    if (typeof c.title !== 'string') return false;
    if (!Array.isArray(c.messages)) return false;
  }
  return true;
}

export async function importConversations(data: ExportData): Promise<number> {
  const db = await getDB();
  let count = 0;
  const tx = db.transaction('conversations', 'readwrite');
  for (const conv of data.conversations) {
    await tx.store.put(conv);
    count++;
  }
  await tx.done;
  return count;
}
