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
import {
  fetchAnnotationsForBook,
  createAnnotation,
  updateAnnotationNote,
  updateAnnotationColor,
  deleteAnnotation,
} from '../services/annotationService';
import type { EpubTocItem, ReaderState, Annotation, AnnotationColor, PendingSelection, SelectionRect } from '../types';

const PROGRESS_SAVE_DEBOUNCE_MS = 1500;

export type ReadMode = 'paginated' | 'scrolled';

const HIGHLIGHT_COLORS: Record<AnnotationColor, string> = {
  yellow: 'rgba(253, 224, 71, 0.45)',
  green:  'rgba(134, 239, 172, 0.45)',
  blue:   'rgba(147, 197, 253, 0.45)',
  pink:   'rgba(249, 168, 212, 0.45)',
  gray:   'rgba(169, 169, 169, 0.45)',
};

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
      .map(v =>
        typeof v === 'string'
          ? v
          : typeof v === 'object' && v !== null && 'name' in v
          ? String((v as { name: unknown }).name)
          : ''
      )
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

function drawAnnotations(
  foliateEl: FoliateViewElement,
  annotations: Annotation[]
) {
  for (const annotation of annotations) {
    try {
      (foliateEl as unknown as {
        addAnnotation: (a: { value: string; color: string }) => void;
      }).addAnnotation({
        value: annotation.cfi,
        color: HIGHLIGHT_COLORS[annotation.color],
      });
    } catch {
      // addAnnotation may not be available on every build of foliate-js
    }
  }
}

export function useEpubReader() {
  const { user } = useAuth();
  const [state, setState] = useState<ReaderState>(initialState);
  const [readMode, setReadModeState] = useState<ReadMode>('paginated');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [pendingSelection, setPendingSelection] = useState<PendingSelection | null>(null);
  const [activeAnnotation, setActiveAnnotation] = useState<{ annotation: Annotation; rect: SelectionRect } | null>(null);

  const foliateViewRef = useRef<HTMLElement | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentBookIdRef = useRef<string | null>(null);
  const currentCfiRef = useRef<string | null>(null);
  const currentPercentageRef = useRef<number>(0);
  const relocateListenerRef = useRef<((e: Event) => void) | null>(null);
  const selectionCleanupRef = useRef<(() => void) | null>(null);
  const annotationsRef = useRef<Annotation[]>([]);

  useEffect(() => {
    annotationsRef.current = annotations;
  }, [annotations]);

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
          // silent
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
      (
        foliateViewRef.current as unknown as FoliateViewElement & {
          renderer: { setAttribute: (k: string, v: string) => void };
        }
      ).renderer?.setAttribute('flow', mode === 'paginated' ? 'paginated' : 'scrolled');
    } catch {
      // renderer may not be ready yet
    }
  }, []);

  const setReadMode = useCallback(
    (mode: ReadMode) => {
      setReadModeState(mode);
      applyReadMode(mode);
    },
    [applyReadMode]
  );

  // ─── Selection listener injection ───────────────────────────────────────────

  const injectSelectionListeners = useCallback(() => {
    if (!foliateViewRef.current) return;

    if (selectionCleanupRef.current) {
      selectionCleanupRef.current();
      selectionCleanupRef.current = null;
    }

    const foliateEl = foliateViewRef.current;

    const handleLoad = (e: Event) => {
      const doc = (e as CustomEvent<{ doc: Document; index: number }>).detail?.doc;
      if (!doc) return;

      const handlePointerUp = () => {
        const sel = doc.getSelection();
        if (!sel || sel.isCollapsed || !sel.rangeCount) return;

        const range = sel.getRangeAt(0);
        const text = sel.toString().trim();
        if (!text) return;

        let cfi: string | null = null;
        try {
          cfi = (
            foliateEl as unknown as { getCFI: (index: number, range: Range) => string }
          ).getCFI(
            (e as CustomEvent<{ doc: Document; index: number }>).detail.index,
            range
          );
        } catch {
          // getCFI may not exist on all versions
        }

        if (!cfi) return;

        const iframeContainerRect = foliateEl.getBoundingClientRect();
        const selectionRectInIframe = range.getBoundingClientRect();

        const absoluteRect: SelectionRect = {
          top: iframeContainerRect.top + selectionRectInIframe.bottom,
          left: iframeContainerRect.left + selectionRectInIframe.left,
          width: selectionRectInIframe.width,
          height: selectionRectInIframe.height,
          bottom: iframeContainerRect.top + selectionRectInIframe.bottom,
          right: iframeContainerRect.left + selectionRectInIframe.right,
        };

        setPendingSelection({ cfi, text, rect: absoluteRect });
        setActiveAnnotation(null);
      };

      doc.addEventListener('pointerup', handlePointerUp);

      const handleSelectionChange = () => {
        const sel = doc.getSelection();
        if (sel && sel.isCollapsed) {
          setPendingSelection(null);
        }
      };
      doc.addEventListener('selectionchange', handleSelectionChange);

      const prevCleanup = selectionCleanupRef.current;
      selectionCleanupRef.current = () => {
        if (prevCleanup) prevCleanup();
        doc.removeEventListener('pointerup', handlePointerUp);
        doc.removeEventListener('selectionchange', handleSelectionChange);
      };
    };

    foliateEl.addEventListener('load', handleLoad as EventListener);

    const existingCleanup = selectionCleanupRef.current as (() => void) | null;
    selectionCleanupRef.current = () => {
      if (typeof existingCleanup === 'function') existingCleanup();
      foliateEl.removeEventListener('load', handleLoad as EventListener);
    };
  }, []);

  // ─── Annotation actions ──────────────────────────────────────────────────────

  const handleSave = useCallback(
    async (color: AnnotationColor, note?: string) => {
      if (!pendingSelection || !user || !currentBookIdRef.current) return;

      const { cfi, text } = pendingSelection;
      setPendingSelection(null);

      const bookId = currentBookIdRef.current;
      const annotation = await createAnnotation(user.id, bookId, cfi, text, color, note ?? '');

      setAnnotations(prev => [...prev, annotation]);

      if (foliateViewRef.current) {
        try {
          (foliateViewRef.current as unknown as {
            addAnnotation: (a: { value: string; color: string }) => void;
          }).addAnnotation({
            value: cfi,
            color: HIGHLIGHT_COLORS[color],
          });
        } catch { /* ignore */ }
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
      setActiveAnnotation({ annotation: updated, rect: activeAnnotation.rect });

      if (foliateViewRef.current) {
        try {
          const el = foliateViewRef.current as unknown as {
            addAnnotation: (a: { value: string; color: string }) => void;
          };
          el.addAnnotation({ value: updated.cfi, color: HIGHLIGHT_COLORS[color] });
        } catch { /* ignore */ }
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
      setActiveAnnotation({ annotation: updated, rect: activeAnnotation.rect });
    },
    [activeAnnotation]
  );

  const handleAnnotationDelete = useCallback(async () => {
    if (!activeAnnotation) return;
    const { annotation } = activeAnnotation;
    setActiveAnnotation(null);

    await deleteAnnotation(annotation.id);
    setAnnotations(prev => prev.filter(a => a.id !== annotation.id));

    if (foliateViewRef.current) {
      try {
        (foliateViewRef.current as unknown as {
          removeAnnotation: (a: { value: string }) => void;
        }).removeAnnotation({ value: annotation.cfi });
      } catch { /* ignore */ }
    }
  }, [activeAnnotation]);

  const dismissPopover = useCallback(() => {
    setPendingSelection(null);
    setActiveAnnotation(null);
  }, []);

  // ─── Load book ───────────────────────────────────────────────────────────────

  const loadBook = useCallback(
    async (file: File) => {
      if (!foliateViewRef.current || !user) return;

      removeRelocateListener();
      setState(s => ({ ...s, isLoading: true, error: null }));
      setAnnotations([]);
      setPendingSelection(null);
      setActiveAnnotation(null);

      try {
        await ensureFoliateLoaded();

        const foliateEl = foliateViewRef.current as unknown as FoliateViewElement;
        const bookId = await computeBookId(file);
        currentBookIdRef.current = bookId;

        try {
          await cacheEpubBlob(bookId, file);
        } catch { /* non-fatal */ }

        await foliateEl.open(file);

        const meta = foliateEl.book?.metadata ?? {};
        const rawTitle = coerceMeta(meta.title).trim() || file.name.replace(/\.epub$/i, '');
        const rawAuthor = coerceMeta(meta.author).trim();
        const rawIdentifier = coerceMeta(meta.identifier).trim();

        const tocItems = foliateEl.book?.toc ? flattenToc(foliateEl.book.toc) : [];

        const resolvedBookId = rawIdentifier !== '' ? rawIdentifier : bookId;
        currentBookIdRef.current = resolvedBookId;

        if (resolvedBookId !== bookId) {
          try {
            await cacheEpubBlob(resolvedBookId, file);
          } catch { /* non-fatal */ }
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

        injectSelectionListeners();

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

        // Load existing annotations
        const existingAnnotations = await fetchAnnotationsForBook(user.id, resolvedBookId);
        setAnnotations(existingAnnotations);
        drawAnnotations(foliateEl, existingAnnotations);

        let resolvedFileUrl: string | null = null;
        try {
          resolvedFileUrl = await uploadEpubToStorage(user.id, resolvedBookId, file);
        } catch { /* non-fatal */ }

        try {
          await upsertReadingProgress(user.id, resolvedBookId, {
            bookTitle: rawTitle,
            bookAuthor: rawAuthor,
            coverUrl: null,
            fileUrl: resolvedFileUrl,
            fileName: file.name,
          });
        } catch { /* non-fatal */ }

        let startCfi: string | undefined;
        try {
          const saved = await fetchReadingProgressByBookId(user.id, resolvedBookId);
          if (saved?.cfi) {
            startCfi = saved.cfi;
            setState(s => ({ ...s, currentCfi: saved.cfi, percentage: saved.percentage ?? 0 }));
          }
        } catch { /* non-fatal */ }

        foliateEl.init({ lastLocation: startCfi ?? '' });
        applyReadMode(readMode);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to open EPUB.';
        setState(s => ({ ...s, isLoading: false, error: msg }));
        removeRelocateListener();
      }
    },
    [user, scheduleSave, removeRelocateListener, applyReadMode, readMode, injectSelectionListeners]
  );

  const goTo = useCallback(
    (cfiOrHref: string) => {
      if (!foliateViewRef.current || !state.isLoaded) return;
      try {
        (foliateViewRef.current as unknown as FoliateViewElement).goTo(cfiOrHref);
      } catch { /* non-fatal */ }
    },
    [state.isLoaded]
  );

  const goToFraction = useCallback(
    (fraction: number) => {
      if (!foliateViewRef.current || !state.isLoaded) return;
      try {
        (foliateViewRef.current as unknown as FoliateViewElement & {
          goToFraction: (fraction: number) => void;
        }).goToFraction(fraction);
      } catch { /* non-fatal */ }
    },
    [state.isLoaded]
  );

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
    if (selectionCleanupRef.current) {
      selectionCleanupRef.current();
      selectionCleanupRef.current = null;
    }
    currentBookIdRef.current = null;
    currentCfiRef.current = null;
    currentPercentageRef.current = 0;
    setAnnotations([]);
    setPendingSelection(null);
    setActiveAnnotation(null);
    setState(initialState);
  }, [user, removeRelocateListener]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      removeRelocateListener();
      if (selectionCleanupRef.current) {
        selectionCleanupRef.current();
      }
    };
  }, [removeRelocateListener]);

  return {
    state,
    readMode,
    setReadMode,
    setViewer,
    foliateViewRef,
    loadBook,
    goTo,
    goToFraction,
    nextPage,
    prevPage,
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
  };
}
