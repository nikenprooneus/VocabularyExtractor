import type { Annotation } from '../types';

const DB_NAME = 'annotation-cache';
const DB_VERSION = 1;
const STORE_NAME = 'annotations';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('book_id', 'bookId', { unique: false });
        store.createIndex('user_book', ['userId', 'bookId'], { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function cacheAnnotation(annotation: Annotation): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).put(annotation);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getCachedAnnotationsForBook(
  userId: string,
  bookId: string
): Promise<Annotation[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('user_book');
    const req = index.getAll([userId, bookId]);
    req.onsuccess = () => resolve((req.result as Annotation[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteCachedAnnotation(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function setCachedAnnotations(annotations: Annotation[]): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    let pending = annotations.length;
    if (pending === 0) { resolve(); return; }
    const done = () => { pending--; if (pending === 0) resolve(); };
    for (const a of annotations) {
      const req = store.put(a);
      req.onsuccess = done;
      req.onerror = () => reject(req.error);
    }
  });
}
