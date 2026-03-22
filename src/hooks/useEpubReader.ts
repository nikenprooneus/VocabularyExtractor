import { useState, useRef, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchReadingProgressByBookId,
  upsertReadingProgress,
  computeBookId,
  uploadEpubToStorage,
} from '../services/readerService';
import { cacheEpubBlob } from '../services/epubCacheService';
import {
  fetchAnnotationsForBook,
  createAnnotation,
  updateAnnotationNote,
  updateAnnotationColor,
  deleteAnnotation,
} from '../services/annotationService';
import type { ReaderState, Annotation, AnnotationColor, PendingSelection, EpubTocItem } from '../types';
import type { FoliateViewHandle, FoliaTocItem } from '../components/reader/FoliateView';

const PROGRESS_SAVE_DEBOUNCE_MS = 1500;

const initialState: ReaderState = {
  bookId: null,
  bookTitle: '',
  bookAuthor: '',
  coverUrl: null,
  currentCfi: null,
  currentTocItem: null,
  percentage: 0,
  toc: [],
  isLoaded: false,
  isLoading: false,
  error: null,
};

export type ReadMode = 'paginated' | 'scrolled';

function mapToc(items: FoliaTocItem[]): EpubTocItem[] {
  return items.map((item, i) => ({
    id: item.href || String(i),
    href: item.href,
    label: item.label,
    subitems: item.subitems ? mapToc(item.subitems) : undefined,
  }));
}

export function useEpubReader() {
  const { user } = useAuth();
  const [state, setState] = useState<ReaderState>(initialState);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [pendingSelection, setPendingSelection] = useState<PendingSelection | null>(null);
  const [activeAnnotation, setActiveAnnotation] = useState<{ annotation: Annotation } | null>(null);
  const [readMode, setReadModeState] = useState<ReadMode>(() => {
    if (typeof window !== 'undefined') {
      const isTouch =
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        ((navigator as unknown as { msMaxTouchPoints?: number }).msMaxTouchPoints ?? 0) > 0;
      return isTouch ? 'scrolled' : 'paginated';
    }
    return 'paginated';
  });
  const [fontSize, setFontSizeState] = useState<number>(100);
  const [fontFamily, setFontFamilyState] = useState<string>('System Default');

  const viewRef = useRef<FoliateViewHandle | null>(null);
  const viewReadyRef = useRef(false);
  const pendingOpenRef = useRef<(() => Promise<void>) | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentBookIdRef = useRef<string | null>(null);
  const currentCfiRef = useRef<string | null>(null);
  const currentPercentageRef = useRef<number>(0);
  const annotationsRef = useRef<Annotation[]>([]);

  useEffect(() => {
    annotationsRef.current = annotations;
  }, [annotations]);

  const scheduleSave = useCallback(
    (bookId: string, cfi: string | null, percentage: number) => {
      if (!user) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        try {
          await upsertReadingProgress(user.id, bookId, { cfi, percentage });
        } catch {
          // silent
        }
      }, PROGRESS_SAVE_DEBOUNCE_MS);
    },
    [user]
  );

  const onRelocate = useCallback(
    (detail: { cfi: string | null; fraction: number; tocItem?: { label: string; href: string } | null }) => {
      const cfi = detail.cfi;
      const pct = Math.round(detail.fraction * 100) / 100;
      if (cfi) {
        currentCfiRef.current = cfi;
        setState(s => ({ ...s, currentCfi: cfi }));
      }
      currentPercentageRef.current = pct;
      setState(s => ({
        ...s,
        percentage: pct,
        currentTocItem: detail.tocItem !== undefined ? (detail.tocItem ?? null) : s.currentTocItem,
      }));
      if (currentBookIdRef.current) {
        scheduleSave(currentBookIdRef.current, cfi ?? currentCfiRef.current, pct);
      }
    },
    [scheduleSave]
  );

  const onSelection = useCallback(
    (detail: { cfi: string; text: string; contextText: string }) => {
      setPendingSelection({
        cfi: detail.cfi,
        text: detail.text,
        contextText: detail.contextText,
        rect: { top: 0, left: 0, width: 0, height: 0, bottom: 0, right: 0 },
      });
      setActiveAnnotation(null);
    },
    []
  );

  const onAnnotationClick = useCallback(
    (value: string) => {
      const annotation = annotationsRef.current.find(a => a.cfi === value);
      if (annotation) {
        setActiveAnnotation({ annotation });
        setPendingSelection(null);
      }
    },
    []
  );

  const onBookReady = useCallback(
    (detail: { title: string; author: string; toc: FoliaTocItem[] }) => {
      setState(s => ({
        ...s,
        bookTitle: detail.title || s.bookTitle,
        bookAuthor: detail.author || s.bookAuthor,
        toc: mapToc(detail.toc),
      }));
      if ((detail.title || detail.author) && currentBookIdRef.current && user) {
        const metaFields: Parameters<typeof upsertReadingProgress>[2] = {};
        if (detail.title) metaFields.bookTitle = detail.title;
        if (detail.author) metaFields.bookAuthor = detail.author;
        upsertReadingProgress(user.id, currentBookIdRef.current, metaFields).catch(() => {});
      }
    },
    [user]
  );

  const onViewReady = useCallback(async () => {
    viewReadyRef.current = true;
    if (pendingOpenRef.current) {
      const pending = pendingOpenRef.current;
      pendingOpenRef.current = null;
      await pending();
    }
  }, []);

  const syncAnnotationsToView = useCallback(
    (toLoad: Annotation[]) => {
      if (!viewRef.current) return;
      for (const ann of toLoad) {
        try {
          viewRef.current.addAnnotation(ann.cfi, ann.color);
        } catch {
          // non-fatal
        }
      }
    },
    []
  );

  const onLoad = useCallback(() => {
    const existing = annotationsRef.current;
    if (existing.length > 0 && viewRef.current) {
      syncAnnotationsToView(existing);
    }
  }, [syncAnnotationsToView]);

  const handleSave = useCallback(
    async (color: AnnotationColor, note?: string) => {
      if (!pendingSelection || !user || !currentBookIdRef.current) return;
      const { cfi, text } = pendingSelection;
      setPendingSelection(null);

      const bookId = currentBookIdRef.current;
      const annotation = await createAnnotation(user.id, bookId, cfi, text, color, note ?? '');
      setAnnotations(prev => [...prev, annotation]);

      try {
        viewRef.current?.addAnnotation(cfi, color);
      } catch {
        // non-fatal
      }
    },
    [pendingSelection, user]
  );

  const handleAnnotationColorChange = useCallback(
    async (color: AnnotationColor) => {
      if (!activeAnnotation) return;
      const { annotation } = activeAnnotation;

      const updated = await updateAnnotationColor(annotation, color);
      setAnnotations(prev => prev.map(a => (a.id === updated.id ? updated : a)));
      setActiveAnnotation({ annotation: updated });

      try {
        viewRef.current?.removeAnnotation(annotation.cfi);
        viewRef.current?.addAnnotation(updated.cfi, color);
      } catch {
        // non-fatal
      }
    },
    [activeAnnotation]
  );

  const handleAnnotationNoteChange = useCallback(
    async (note: string) => {
      if (!activeAnnotation) return;
      const { annotation } = activeAnnotation;
      const updated = await updateAnnotationNote(annotation, note);
      setAnnotations(prev => prev.map(a => (a.id === updated.id ? updated : a)));
      setActiveAnnotation({ annotation: updated });
    },
    [activeAnnotation]
  );

  const handleAnnotationDelete = useCallback(async () => {
    if (!activeAnnotation) return;
    const { annotation } = activeAnnotation;
    setActiveAnnotation(null);

    await deleteAnnotation(annotation.id);
    setAnnotations(prev => prev.filter(a => a.id !== annotation.id));

    try {
      viewRef.current?.removeAnnotation(annotation.cfi);
    } catch {
      // non-fatal
    }
  }, [activeAnnotation]);

  const dismissPopover = useCallback(() => {
    setPendingSelection(null);
    setActiveAnnotation(null);
  }, []);

  const loadBook = useCallback(
    async (file: File) => {
      if (!user) return;

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      setState(s => ({ ...s, isLoading: true, error: null }));
      setAnnotations([]);
      setPendingSelection(null);
      setActiveAnnotation(null);

      try {
        const bookId = await computeBookId(file);
        currentBookIdRef.current = bookId;

        try {
          await cacheEpubBlob(bookId, file);
        } catch {
          // non-fatal
        }

        const existingAnnotations = await fetchAnnotationsForBook(user.id, bookId);
        setAnnotations(existingAnnotations);
        annotationsRef.current = existingAnnotations;

        let savedCfi: string | null = null;
        let savedPercentage = 0;
        try {
          const saved = await fetchReadingProgressByBookId(user.id, bookId);
          if (saved?.cfi) {
            savedCfi = saved.cfi;
            savedPercentage = saved.percentage ?? 0;
          }
        } catch {
          // non-fatal
        }

        let resolvedFileUrl: string | null = null;
        try {
          resolvedFileUrl = await uploadEpubToStorage(user.id, bookId, file);
        } catch {
          // non-fatal
        }

        const bookTitle = file.name.replace(/\.epub$/i, '');

        try {
          const progressFields: Parameters<typeof upsertReadingProgress>[2] = {
            fileName: file.name,
            cfi: savedCfi,
            percentage: savedPercentage || null,
          };
          if (bookTitle) progressFields.bookTitle = bookTitle;
          if (resolvedFileUrl) progressFields.fileUrl = resolvedFileUrl;
          await upsertReadingProgress(user.id, bookId, progressFields);
        } catch {
          // non-fatal
        }

        if (savedCfi) {
          currentCfiRef.current = savedCfi;
          currentPercentageRef.current = savedPercentage;
          setState(s => ({ ...s, currentCfi: savedCfi, percentage: savedPercentage }));
        }

        setState(s => ({
          ...s,
          bookId,
          bookTitle,
          bookAuthor: '',
          coverUrl: null,
          toc: [],
          isLoaded: true,
          isLoading: false,
        }));

        const openBook = async () => {
          if (!viewRef.current) return;
          await viewRef.current.open(file);
          if (savedCfi) {
            await viewRef.current.init({ lastLocation: savedCfi });
          } else {
            await viewRef.current.init({ showTextStart: true });
          }
          syncAnnotationsToView(existingAnnotations);
        };

        if (viewReadyRef.current) {
          await openBook();
        } else {
          pendingOpenRef.current = openBook;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to open EPUB.';
        toast.error(msg);
        setState(s => ({ ...s, isLoading: false, isLoaded: false, error: msg }));
      }
    },
    [user, syncAnnotationsToView]
  );

  const closeBook = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      if (user && currentBookIdRef.current) {
        try {
          await upsertReadingProgress(user.id, currentBookIdRef.current, {
            cfi: currentCfiRef.current,
            percentage: currentPercentageRef.current,
          });
        } catch {
          // ignore
        }
      }
    }

    try {
      viewRef.current?.close();
    } catch {
      // non-fatal
    }

    currentBookIdRef.current = null;
    currentCfiRef.current = null;
    currentPercentageRef.current = 0;
    setAnnotations([]);
    setPendingSelection(null);
    setActiveAnnotation(null);
    setState(initialState);
  }, [user]);

  const setReadMode = useCallback((newMode: ReadMode) => {
    setReadModeState(newMode);
    viewRef.current?.setFlow(newMode);
  }, []);

  const setFontSize = useCallback((sizeOrUpdater: number | ((prev: number) => number)) => {
    setFontSizeState(prev => {
      const newSize = typeof sizeOrUpdater === 'function' ? sizeOrUpdater(prev) : sizeOrUpdater;
      viewRef.current?.setFontSize(newSize);
      return newSize;
    });
  }, []);

  const setFontFamily = useCallback((family: string) => {
    setFontFamilyState(family);
    viewRef.current?.setFontFamily(family);
  }, []);

  const prevPage = useCallback(async () => {
    try {
      await viewRef.current?.prev();
    } catch {
      // non-fatal
    }
  }, []);

  const nextPage = useCallback(async () => {
    try {
      await viewRef.current?.next();
    } catch {
      // non-fatal
    }
  }, []);

  const goToTocItem = useCallback(async (href: string) => {
    try {
      await viewRef.current?.goTo(href);
    } catch {
      // non-fatal
    }
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return {
    state,
    viewRef,
    loadBook,
    closeBook,
    annotations,
    pendingSelection,
    activeAnnotation,
    setActiveAnnotation,
    handleSave,
    handleAnnotationColorChange,
    handleAnnotationNoteChange,
    handleAnnotationDelete,
    dismissPopover,
    onRelocate,
    onSelection,
    onAnnotationClick,
    onBookReady,
    onLoad,
    onViewReady,
    readMode,
    setReadMode,
    fontSize,
    setFontSize,
    fontFamily,
    setFontFamily,
    prevPage,
    nextPage,
    goToTocItem,
  };
}
