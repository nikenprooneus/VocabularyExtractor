import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchReadingProgressByBookId,
  upsertReadingProgress,
  computeBookId,
  uploadEpubToStorage,
} from '../services/readerService';
import { cacheEpubBlob } from '../services/epubCacheService';
import { ensureFoliateLoaded } from '../utils/foliateLoader';
import type { EpubTocItem, ReaderState } from '../types';

const PROGRESS_SAVE_DEBOUNCE_MS = 1500;

export type ReadMode = 'paginated' | 'scrolled';

const initialState: ReaderState = {
  bookId: null,
  bookTitle: '',
  bookAuthor: '',
  coverUrl: null,
  currentCfi: null,
  percentage: 0,
  toc: [],
  isLoaded: false,
  isLoading: false,
  error: null,
};

function coerceMeta(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value
      .map(v => (typeof v === 'string' ? v : typeof v === 'object' && v !== null && 'name' in v ? String((v as { name: unknown }).name) : ''))
      .filter(Boolean)
      .join(', ');
  }
  if (typeof value === 'object' && value !== null && 'name' in value) {
    return String((value as { name: unknown }).name);
  }
  return '';
}

function flattenToc(items: FoliateBookTocItem[], depth = 0): EpubTocItem[] {
  return items.flatMap(item => {
    const node: EpubTocItem = {
      id: item.href,
      href: item.href,
      label: item.label,
    };
    if (Array.isArray(item.subitems) && item.subitems.length > 0) {
      node.subitems = flattenToc(item.subitems, depth + 1);
    }
    return [node];
  });
}

export function useEpubReader() {
  const { user } = useAuth();
  const [state, setState] = useState<ReaderState>(initialState);
  const [readMode, setReadModeState] = useState<ReadMode>('paginated');
  const foliateViewRef = useRef<HTMLElement | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentBookIdRef = useRef<string | null>(null);
  const currentCfiRef = useRef<string | null>(null);
  const currentPercentageRef = useRef<number>(0);
  const relocateListenerRef = useRef<((e: Event) => void) | null>(null);

  const setViewer = useCallback((el: HTMLElement | null) => {
    foliateViewRef.current = el;
  }, []);

  const scheduleSave = useCallback(
    (bookId: string, cfi: string | null, percentage: number) => {
      if (!user) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        try {
          await upsertReadingProgress(user.id, bookId, { cfi, percentage });
        } catch {
          // Silent – progress save failures shouldn't interrupt reading
        }
      }, PROGRESS_SAVE_DEBOUNCE_MS);
    },
    [user]
  );

  const removeRelocateListener = useCallback(() => {
    if (foliateViewRef.current && relocateListenerRef.current) {
      foliateViewRef.current.removeEventListener('relocate', relocateListenerRef.current);
      relocateListenerRef.current = null;
    }
  }, []);

  const applyReadMode = useCallback((mode: ReadMode) => {
    if (!foliateViewRef.current) return;
    try {
      (foliateViewRef.current as unknown as FoliateViewElement & { renderer: { setAttribute: (k: string, v: string) => void } }).renderer?.setAttribute('flow', mode === 'paginated' ? 'paginated' : 'scrolled');
    } catch {
      // renderer may not be ready yet; ignore
    }
  }, []);

  const setReadMode = useCallback((mode: ReadMode) => {
    setReadModeState(mode);
    applyReadMode(mode);
  }, [applyReadMode]);

  const loadBook = useCallback(
    async (file: File) => {
      if (!foliateViewRef.current || !user) return;

      removeRelocateListener();
      setState(s => ({ ...s, isLoading: true, error: null }));

      try {
        await ensureFoliateLoaded();

        const foliateEl = foliateViewRef.current as unknown as FoliateViewElement;

        const bookId = await computeBookId(file);
        currentBookIdRef.current = bookId;

        // Cache the blob in IndexedDB (offline-first)
        try {
          await cacheEpubBlob(bookId, file);
        } catch {
          // cache failure is non-fatal
        }

        await foliateEl.open(file);

        const meta = foliateEl.book?.metadata ?? {};
        const rawTitle = coerceMeta(meta.title).trim() || file.name.replace(/\.epub$/i, '');
        const rawAuthor = coerceMeta(meta.author).trim();
        const rawIdentifier = coerceMeta(meta.identifier).trim();

        const tocItems = foliateEl.book?.toc ? flattenToc(foliateEl.book.toc) : [];

        const resolvedBookId = rawIdentifier !== '' ? rawIdentifier : bookId;
        currentBookIdRef.current = resolvedBookId;

        // Re-cache under the resolved stable ID if it differs
        if (resolvedBookId !== bookId) {
          try {
            await cacheEpubBlob(resolvedBookId, file);
          } catch {
            // non-fatal
          }
        }

        const onRelocate = (e: Event) => {
          const detail = (e as CustomEvent<FoliateRelocateDetail>).detail;
          const cfi = detail?.cfi ?? null;
          const percentage = detail?.fraction ?? 0;
          currentCfiRef.current = cfi;
          currentPercentageRef.current = percentage;
          setState(s => ({ ...s, currentCfi: cfi, percentage }));
          if (currentBookIdRef.current) {
            scheduleSave(currentBookIdRef.current, cfi, percentage);
          }
        };

        relocateListenerRef.current = onRelocate;
        foliateViewRef.current.addEventListener('relocate', onRelocate);

        setState(s => ({
          ...s,
          bookId: resolvedBookId,
          bookTitle: rawTitle,
          bookAuthor: rawAuthor,
          coverUrl: null,
          toc: tocItems,
          isLoaded: true,
          isLoading: false,
        }));

        // Upload to Supabase Storage in the background (non-blocking)
        let resolvedFileUrl: string | null = null;
        try {
          resolvedFileUrl = await uploadEpubToStorage(user.id, resolvedBookId, file);
        } catch {
          // non-fatal
        }

        try {
          await upsertReadingProgress(user.id, resolvedBookId, {
            bookTitle: rawTitle,
            bookAuthor: rawAuthor,
            coverUrl: null,
            fileUrl: resolvedFileUrl,
            fileName: file.name,
          });
        } catch {
          // non-fatal
        }

        let startCfi: string | undefined;
        try {
          const saved = await fetchReadingProgressByBookId(user.id, resolvedBookId);
          if (saved?.cfi) {
            startCfi = saved.cfi;
            setState(s => ({ ...s, currentCfi: saved.cfi, percentage: saved.percentage ?? 0 }));
          }
        } catch {
          // non-fatal
        }

        foliateEl.init({ lastLocation: startCfi ?? '' });

        // Apply current read mode after init
        applyReadMode(readMode);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to open EPUB.';
        setState(s => ({ ...s, isLoading: false, error: msg }));
        removeRelocateListener();
      }
    },
    [user, scheduleSave, removeRelocateListener, applyReadMode, readMode]
  );

  const goTo = useCallback((cfiOrHref: string) => {
    if (!foliateViewRef.current || !state.isLoaded) return;
    try {
      (foliateViewRef.current as unknown as FoliateViewElement).goTo(cfiOrHref);
    } catch {
      // non-fatal
    }
  }, [state.isLoaded]);

  const nextPage = useCallback(() => {
    if (!foliateViewRef.current || !state.isLoaded) return;
    try {
      (foliateViewRef.current as unknown as FoliateViewElement).next();
    } catch { /* ignore */ }
  }, [state.isLoaded]);

  const prevPage = useCallback(() => {
    if (!foliateViewRef.current || !state.isLoaded) return;
    try {
      (foliateViewRef.current as unknown as FoliateViewElement).prev();
    } catch { /* ignore */ }
  }, [state.isLoaded]);

  const closeBook = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      if (user && currentBookIdRef.current) {
        try {
          await upsertReadingProgress(user.id, currentBookIdRef.current, {
            cfi: currentCfiRef.current,
            percentage: currentPercentageRef.current,
          });
        } catch { /* ignore */ }
      }
    }
    removeRelocateListener();
    currentBookIdRef.current = null;
    currentCfiRef.current = null;
    currentPercentageRef.current = 0;
    setState(initialState);
  }, [user, removeRelocateListener]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      removeRelocateListener();
    };
  }, [removeRelocateListener]);

  return {
    state,
    readMode,
    setReadMode,
    setViewer,
    loadBook,
    goTo,
    nextPage,
    prevPage,
    closeBook,
  };
}
