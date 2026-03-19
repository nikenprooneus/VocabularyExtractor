import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchReadingProgressByBookId,
  upsertReadingProgress,
  computeBookId,
} from '../services/readerService';
import { ensureFoliateLoaded } from '../utils/foliateLoader';
import type { EpubTocItem, ReaderState } from '../types';

const PROGRESS_SAVE_DEBOUNCE_MS = 1500;

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

        await foliateEl.open(file);

        const meta = foliateEl.book?.metadata ?? {};
        const rawTitle = meta.title?.trim() || file.name.replace(/\.epub$/i, '');
        const rawAuthor = meta.author?.trim() || '';
        const rawIdentifier = meta.identifier?.trim() || '';

        const tocItems = foliateEl.book?.toc ? flattenToc(foliateEl.book.toc) : [];

        const resolvedBookId = rawIdentifier !== '' ? rawIdentifier : bookId;
        currentBookIdRef.current = resolvedBookId;

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

        try {
          await upsertReadingProgress(user.id, resolvedBookId, {
            bookTitle: rawTitle,
            bookAuthor: rawAuthor,
            coverUrl: null,
          });
        } catch {
          // Persist failure is non-fatal
        }

        let startCfi: string | undefined;
        try {
          const saved = await fetchReadingProgressByBookId(user.id, resolvedBookId);
          if (saved?.cfi) {
            startCfi = saved.cfi;
            setState(s => ({ ...s, currentCfi: saved.cfi, percentage: saved.percentage ?? 0 }));
          }
        } catch {
          // Restore failure is non-fatal
        }

        foliateEl.init({ lastLocation: startCfi ?? '' });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to open EPUB.';
        setState(s => ({ ...s, isLoading: false, error: msg }));
        removeRelocateListener();
      }
    },
    [user, scheduleSave, removeRelocateListener]
  );

  const goTo = useCallback((cfiOrHref: string) => {
    if (!foliateViewRef.current || !state.isLoaded) return;
    try {
      (foliateViewRef.current as unknown as FoliateViewElement).goTo(cfiOrHref);
    } catch {
      // Navigation failure is non-fatal
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
    setViewer,
    loadBook,
    goTo,
    nextPage,
    prevPage,
    closeBook,
  };
}
