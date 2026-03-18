import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchReadingProgressByBookId,
  upsertReadingProgress,
  computeBookId,
} from '../services/readerService';
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

type FoliateRelocateEvent = CustomEvent<{
  cfi: string;
  fraction: number;
  tocItem?: { id: string; href: string; label: string };
}>;

type FoliateLoadEvent = CustomEvent<{
  book: {
    metadata?: {
      title?: string;
      author?: string;
      identifier?: string;
    };
    toc?: Array<{ id: string; href: string; label: string; subitems?: unknown[] }>;
    getCover?: () => Promise<Blob | null>;
  };
}>;

function flattenToc(
  items: Array<{ id: string; href: string; label: string; subitems?: unknown[] }>,
  depth = 0
): EpubTocItem[] {
  return items.flatMap(item => {
    const node: EpubTocItem = {
      id: item.id ?? item.href,
      href: item.href,
      label: item.label,
    };
    const children = Array.isArray(item.subitems) && item.subitems.length > 0
      ? flattenToc(item.subitems as Array<{ id: string; href: string; label: string; subitems?: unknown[] }>, depth + 1)
      : undefined;
    if (children) node.subitems = children;
    return [node];
  });
}

export function useEpubReader() {
  const { user } = useAuth();
  const [state, setState] = useState<ReaderState>(initialState);
  const viewerRef = useRef<HTMLElement | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentBookIdRef = useRef<string | null>(null);
  const currentCfiRef = useRef<string | null>(null);
  const currentPercentageRef = useRef<number>(0);

  const setViewer = useCallback((el: HTMLElement | null) => {
    viewerRef.current = el;
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

  const loadBook = useCallback(
    async (file: File) => {
      if (!viewerRef.current || !user) return;

      setState(s => ({ ...s, isLoading: true, error: null }));

      try {
        // Dynamically load foliate-js web component
        // @ts-ignore – foliate-js has no TS typings
        await import('https://cdn.jsdelivr.net/npm/foliate-js@3.1.0/view.js');
      } catch {
        setState(s => ({ ...s, isLoading: false, error: 'Failed to load the reader engine.' }));
        return;
      }

      try {
        const bookId = await computeBookId(file);
        currentBookIdRef.current = bookId;

        const el = viewerRef.current as HTMLElement & {
          open: (book: unknown) => Promise<void>;
          goTo: (target: string) => Promise<void>;
          next: () => Promise<void>;
          prev: () => Promise<void>;
        };

        const handleRelocate = (e: Event) => {
          const event = e as FoliateRelocateEvent;
          const cfi = event.detail?.cfi ?? null;
          const fraction = event.detail?.fraction ?? 0;
          const percentage = Math.round(fraction * 1000) / 1000;
          currentCfiRef.current = cfi;
          currentPercentageRef.current = percentage;
          setState(s => ({ ...s, currentCfi: cfi, percentage }));
          if (currentBookIdRef.current) {
            scheduleSave(currentBookIdRef.current, cfi, percentage);
          }
        };

        const handleLoad = async (e: Event) => {
          const event = e as FoliateLoadEvent;
          const book = event.detail?.book;
          const meta = book?.metadata ?? {};
          const rawTitle = meta.title ?? file.name.replace(/\.epub$/i, '');
          const rawAuthor = meta.author ?? '';
          const rawIdentifier = meta.identifier ?? '';

          const tocItems = Array.isArray(book?.toc) ? flattenToc(book.toc!) : [];

          let coverUrl: string | null = null;
          try {
            if (typeof book?.getCover === 'function') {
              const blob = await book.getCover();
              if (blob) coverUrl = URL.createObjectURL(blob);
            }
          } catch {
            // Cover fetch is best-effort
          }

          const resolvedBookId = rawIdentifier.trim() !== '' ? rawIdentifier : bookId;
          currentBookIdRef.current = resolvedBookId;

          setState(s => ({
            ...s,
            bookId: resolvedBookId,
            bookTitle: rawTitle,
            bookAuthor: rawAuthor,
            coverUrl,
            toc: tocItems,
            isLoaded: true,
            isLoading: false,
          }));

          // Persist metadata immediately
          try {
            await upsertReadingProgress(user.id, resolvedBookId, {
              bookTitle: rawTitle,
              bookAuthor: rawAuthor,
              coverUrl,
            });
          } catch {
            // Persist failure is non-fatal
          }

          // Restore saved position
          try {
            const saved = await fetchReadingProgressByBookId(user.id, resolvedBookId);
            if (saved?.cfi) {
              await el.goTo(saved.cfi);
              setState(s => ({ ...s, currentCfi: saved.cfi, percentage: saved.percentage ?? 0 }));
            }
          } catch {
            // Restore failure is non-fatal
          }
        };

        el.addEventListener('relocate', handleRelocate);
        el.addEventListener('load', handleLoad);

        // Use EPUBjs-like interface via foliate-js
        // @ts-ignore
        const { EPUB } = await import('https://cdn.jsdelivr.net/npm/foliate-js@3.1.0/epub.js');
        const book = await new EPUB(file).init();
        await el.open(book);

        return () => {
          el.removeEventListener('relocate', handleRelocate);
          el.removeEventListener('load', handleLoad);
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to open EPUB.';
        setState(s => ({ ...s, isLoading: false, error: msg }));
      }
    },
    [user, scheduleSave]
  );

  const goTo = useCallback(async (cfiOrHref: string) => {
    const el = viewerRef.current as (HTMLElement & { goTo: (t: string) => Promise<void> }) | null;
    if (!el || !state.isLoaded) return;
    try {
      await el.goTo(cfiOrHref);
    } catch {
      // Navigation failure is non-fatal
    }
  }, [state.isLoaded]);

  const nextPage = useCallback(async () => {
    const el = viewerRef.current as (HTMLElement & { next: () => Promise<void> }) | null;
    if (!el || !state.isLoaded) return;
    try { await el.next(); } catch { /* ignore */ }
  }, [state.isLoaded]);

  const prevPage = useCallback(async () => {
    const el = viewerRef.current as (HTMLElement & { prev: () => Promise<void> }) | null;
    if (!el || !state.isLoaded) return;
    try { await el.prev(); } catch { /* ignore */ }
  }, [state.isLoaded]);

  const closeBook = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      // Flush pending save immediately
      if (user && currentBookIdRef.current) {
        try {
          await upsertReadingProgress(user.id, currentBookIdRef.current, {
            cfi: currentCfiRef.current,
            percentage: currentPercentageRef.current,
          });
        } catch { /* ignore */ }
      }
    }
    currentBookIdRef.current = null;
    currentCfiRef.current = null;
    currentPercentageRef.current = 0;
    setState(initialState);
  }, [user]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

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
