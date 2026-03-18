import { useState, useRef, useCallback, useEffect } from 'react';
import ePub, { type Rendition, type Book, type NavItem } from 'epubjs';
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

function flattenNavItems(items: NavItem[], depth = 0): EpubTocItem[] {
  return items.flatMap(item => {
    const node: EpubTocItem = {
      id: item.id ?? item.href,
      href: item.href,
      label: item.label,
    };
    if (Array.isArray(item.subitems) && item.subitems.length > 0) {
      node.subitems = flattenNavItems(item.subitems as NavItem[], depth + 1);
    }
    return [node];
  });
}

export function useEpubReader() {
  const { user } = useAuth();
  const [state, setState] = useState<ReaderState>(initialState);
  const viewerRef = useRef<HTMLElement | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const bookRef = useRef<Book | null>(null);
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

  const destroyCurrentBook = useCallback(() => {
    if (renditionRef.current) {
      try { renditionRef.current.destroy(); } catch { /* ignore */ }
      renditionRef.current = null;
    }
    if (bookRef.current) {
      try { bookRef.current.destroy(); } catch { /* ignore */ }
      bookRef.current = null;
    }
  }, []);

  const loadBook = useCallback(
    async (file: File) => {
      if (!viewerRef.current || !user) return;

      destroyCurrentBook();
      setState(s => ({ ...s, isLoading: true, error: null }));

      try {
        const bookId = await computeBookId(file);
        currentBookIdRef.current = bookId;

        const buffer = await file.arrayBuffer();
        const book = ePub(buffer);
        bookRef.current = book;

        const rendition = book.renderTo(viewerRef.current, {
          width: '100%',
          height: '100%',
          flow: 'paginated',
          spread: 'none',
        });
        renditionRef.current = rendition;

        await book.ready;

        const meta = book.package.metadata;
        const rawTitle = (meta as { title?: string }).title?.trim() || file.name.replace(/\.epub$/i, '');
        const rawAuthor = (meta as { creator?: string }).creator?.trim() || '';
        const rawIdentifier = (meta as { identifier?: string }).identifier?.trim() || '';

        const navItems: NavItem[] = await (book.navigation as unknown as { toc: NavItem[] }).toc ?? [];
        const tocItems = flattenNavItems(navItems);

        let coverUrl: string | null = null;
        try {
          const coverHref = await book.coverUrl();
          if (coverHref) coverUrl = coverHref;
        } catch {
          // Cover fetch is best-effort
        }

        const resolvedBookId = rawIdentifier !== '' ? rawIdentifier : bookId;
        currentBookIdRef.current = resolvedBookId;

        rendition.on('relocated', (location: { start: { cfi: string; percentage: number } }) => {
          const cfi = location.start.cfi ?? null;
          const percentage = Math.round((location.start.percentage ?? 0) * 1000) / 1000;
          currentCfiRef.current = cfi;
          currentPercentageRef.current = percentage;
          setState(s => ({ ...s, currentCfi: cfi, percentage }));
          if (currentBookIdRef.current) {
            scheduleSave(currentBookIdRef.current, cfi, percentage);
          }
        });

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

        try {
          await upsertReadingProgress(user.id, resolvedBookId, {
            bookTitle: rawTitle,
            bookAuthor: rawAuthor,
            coverUrl,
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

        await rendition.display(startCfi);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to open EPUB.';
        setState(s => ({ ...s, isLoading: false, error: msg }));
        destroyCurrentBook();
      }
    },
    [user, scheduleSave, destroyCurrentBook]
  );

  const goTo = useCallback(async (cfiOrHref: string) => {
    if (!renditionRef.current || !state.isLoaded) return;
    try {
      await renditionRef.current.display(cfiOrHref);
    } catch {
      // Navigation failure is non-fatal
    }
  }, [state.isLoaded]);

  const nextPage = useCallback(async () => {
    if (!renditionRef.current || !state.isLoaded) return;
    try { await renditionRef.current.next(); } catch { /* ignore */ }
  }, [state.isLoaded]);

  const prevPage = useCallback(async () => {
    if (!renditionRef.current || !state.isLoaded) return;
    try { await renditionRef.current.prev(); } catch { /* ignore */ }
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
    destroyCurrentBook();
    currentBookIdRef.current = null;
    currentCfiRef.current = null;
    currentPercentageRef.current = 0;
    setState(initialState);
  }, [user, destroyCurrentBook]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      destroyCurrentBook();
    };
  }, [destroyCurrentBook]);

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
