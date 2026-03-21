import { useState, useRef, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import type { Rendition } from 'epubjs';
import { EpubCFI } from 'epubjs';
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
import type { ReaderState, Annotation, AnnotationColor, PendingSelection } from '../types';

const PROGRESS_SAVE_DEBOUNCE_MS = 1500;

const HIGHLIGHT_COLORS: Record<AnnotationColor, string> = {
  yellow: 'rgba(253, 224, 71, 0.45)',
  green: 'rgba(134, 239, 172, 0.45)',
  blue: 'rgba(147, 197, 253, 0.45)',
  pink: 'rgba(249, 168, 212, 0.45)',
  gray: 'rgba(169, 169, 169, 0.45)',
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

export type ReadMode = 'paginated' | 'scrolled';

const FONT_FAMILY_MAP: Record<string, string> = {
  'System Default': 'inherit',
  'Serif': 'Georgia, serif',
  'Sans-Serif': 'Arial, sans-serif',
  'Monospace': '"Courier New", monospace',
};

export function useEpubReader() {
  const { user } = useAuth();
  const [state, setState] = useState<ReaderState>(initialState);
  const [location, setLocation] = useState<string | number>(0);
  const [bookBuffer, setBookBuffer] = useState<ArrayBuffer | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [pendingSelection, setPendingSelection] = useState<PendingSelection | null>(null);
  const [activeAnnotation, setActiveAnnotation] = useState<{ annotation: Annotation } | null>(null);
  const [readMode, setReadMode] = useState<ReadMode>('paginated');
  const [fontSize, setFontSize] = useState<number>(100);
  const [fontFamily, setFontFamily] = useState<string>('System Default');

  const renditionRef = useRef<Rendition | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentBookIdRef = useRef<string | null>(null);
  const currentCfiRef = useRef<string | null>(null);
  const currentPercentageRef = useRef<number>(0);
  const pendingCfiRef = useRef<string | null>(null);
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

  const onLocationChanged = useCallback(
    (epubcfi: string) => {
      setLocation(epubcfi);
      currentCfiRef.current = epubcfi;
      setState(s => ({ ...s, currentCfi: epubcfi }));
      if (currentBookIdRef.current) {
        scheduleSave(currentBookIdRef.current, epubcfi, currentPercentageRef.current);
      }
    },
    [scheduleSave]
  );

  const loadAnnotations = useCallback((rendition: Rendition, toLoad: Annotation[]) => {
    for (const annotation of toLoad) {
      try {
        const annotationSnapshot = annotation;
        rendition.annotations.highlight(
          annotation.cfi,
          {},
          () => {
            setActiveAnnotation({ annotation: annotationSnapshot });
            setPendingSelection(null);
          },
          'hl',
          { fill: HIGHLIGHT_COLORS[annotation.color], 'fill-opacity': '1' }
        );
      } catch {
        // non-fatal
      }
    }
  }, []);

  const getRendition = useCallback(
    (rendition: Rendition) => {
      renditionRef.current = rendition;

      rendition.themes.register('dark-taupe', {
        body: {
          background: '#1c1a18 !important',
          color: '#faf9f7 !important',
          'font-size': '1rem',
          'line-height': '1.75',
          padding: '0 2rem',
        },
        a: { color: '#c9a96e !important' },
        'a:hover': { color: '#d4b47a !important' },
        p: { margin: '0 0 1em 0' },
        h1: { color: '#faf9f7 !important' },
        h2: { color: '#faf9f7 !important' },
        h3: { color: '#faf9f7 !important' },
        img: { 'max-width': '100% !important' },
      });
      rendition.themes.select('dark-taupe');

      rendition.on('selected', (cfiRange: string) => {
        try {
          const range = rendition.getRange(cfiRange);
          const text = range?.toString().trim() ?? '';
          if (!text) return;
          const contextText = range?.commonAncestorContainer?.textContent?.trim() || text;
          setPendingSelection({
            cfi: cfiRange,
            text,
            contextText,
            rect: { top: 0, left: 0, width: 0, height: 0, bottom: 0, right: 0 },
          });
          setActiveAnnotation(null);
        } catch {
          // non-fatal
        }
      });

      rendition.hooks.content.register((contents: any) => {
        try {
          const doc = contents.document;
          const addSelectionStyles = (el: HTMLElement | null) => {
            if (!el) return;
            el.style.setProperty('-webkit-user-select', 'text', 'important');
            el.style.setProperty('user-select', 'text', 'important');
            el.style.setProperty('-webkit-touch-callout', 'default', 'important');
          };
          addSelectionStyles(doc.documentElement);
          addSelectionStyles(doc.body);
          doc.documentElement.style.setProperty('overflow', 'visible', 'important');
          doc.body?.style.setProperty('overflow', 'visible', 'important');
          doc.documentElement.style.setProperty('touch-action', 'auto', 'important');
          doc.body?.style.setProperty('touch-action', 'auto', 'important');
          if (doc.body) {
            doc.body.style.touchAction = 'auto';
          }

          contents.document.addEventListener('touchstart', () => {
            if (!contents.document.hasFocus()) {
              contents.window.focus();
            }
          }, { passive: true });
        } catch {
          // non-fatal
        }

        const buildCfi = (range: Range): string => {
          try {
            if (contents.cfiBase) {
              const cfi = new EpubCFI(range, contents.cfiBase).toString();
              toast.success('CFI Math Success!', { id: 'cfi-success' });
              return cfi;
            } else {
              toast.error('Missing cfiBase', { id: 'cfi-error-base' });
            }
          } catch (err: any) {
            toast.error('CFI Error: ' + (err.message || 'Unknown'), { id: 'cfi-error' });
          }
          return '';
        };

        const snapshotSelection = (): { text: string; contextText: string; range: Range } | null => {
          try {
            const sel = contents.window.getSelection();
            if (!sel || sel.rangeCount === 0) return null;
            const text = sel.toString().trim();
            if (!text) return null;
            toast('Mobile Sel: ' + text.substring(0, 10) + '...', { id: 'sel-text' });
            const range = sel.getRangeAt(0).cloneRange();
            const contextText = range.commonAncestorContainer?.textContent?.trim() || text;
            return { text, contextText, range };
          } catch {
            return null;
          }
        };

        const commitSnapshot = (snapshot: { text: string; contextText: string; range: Range }) => {
          const cfi = buildCfi(snapshot.range);
          if (!cfi) {
            toast.error('Commit failed: Empty CFI', { id: 'commit-fail' });
            return;
          }
          toast.success('State Set! Popover should appear', { id: 'state-set' });
          setPendingSelection(prev => {
            if (prev && prev.text === snapshot.text) return prev;
            return {
              cfi,
              text: snapshot.text,
              contextText: snapshot.contextText,
              rect: { top: 0, left: 0, width: 0, height: 0, bottom: 0, right: 0 },
            };
          });
          setActiveAnnotation(null);
        };

        let pendingSnapshot: { text: string; contextText: string; range: Range } | null = null;
        let commitTimer: ReturnType<typeof setTimeout> | null = null;

        const scheduleCommit = (snapshot: { text: string; contextText: string; range: Range }) => {
          pendingSnapshot = snapshot;
          if (commitTimer) clearTimeout(commitTimer);
          commitTimer = setTimeout(() => {
            if (pendingSnapshot) commitSnapshot(pendingSnapshot);
            pendingSnapshot = null;
          }, 80);
        };

        contents.document.addEventListener('selectionchange', () => {
          const snapshot = snapshotSelection();
          if (!snapshot) return;
          scheduleCommit(snapshot);
        });

        contents.document.addEventListener('touchend', () => {
          const snapshot = snapshotSelection();
          if (snapshot) {
            if (commitTimer) clearTimeout(commitTimer);
            pendingSnapshot = snapshot;
            commitTimer = setTimeout(() => {
              if (pendingSnapshot) commitSnapshot(pendingSnapshot);
              pendingSnapshot = null;
            }, 300);
          } else if (pendingSnapshot) {
            const snap = pendingSnapshot;
            if (commitTimer) clearTimeout(commitTimer);
            commitTimer = setTimeout(() => {
              commitSnapshot(snap);
              pendingSnapshot = null;
            }, 300);
          }
        }, { passive: true });

        contents.document.addEventListener('mouseup', () => {
          const snapshot = snapshotSelection();
          if (!snapshot) return;
          if (commitTimer) clearTimeout(commitTimer);
          commitSnapshot(snapshot);
          pendingSnapshot = null;
        });
      });

      rendition.on('relocated', (loc: { start: { percentage: number } }) => {
        const pct = Math.round((loc?.start?.percentage ?? 0) * 100) / 100;
        currentPercentageRef.current = pct;
        setState(s => ({ ...s, percentage: pct }));
      });

      rendition.on('rendered', () => {
        const savedCfi = pendingCfiRef.current;
        if (savedCfi) {
          pendingCfiRef.current = null;
          try {
            rendition.display(savedCfi);
          } catch {
            // non-fatal — fall back to start of book
          }
        }

        const existing = annotationsRef.current;
        if (existing.length > 0) {
          loadAnnotations(rendition, existing);
        }
      });

    },
    [loadAnnotations]
  );

  const handleSave = useCallback(
    async (color: AnnotationColor, note?: string) => {
      if (!pendingSelection || !user || !currentBookIdRef.current) return;
      const { cfi, text } = pendingSelection;
      setPendingSelection(null);

      const bookId = currentBookIdRef.current;
      const annotation = await createAnnotation(user.id, bookId, cfi, text, color, note ?? '');
      setAnnotations(prev => [...prev, annotation]);

      if (renditionRef.current) {
        try {
          const annotationSnapshot = annotation;
          renditionRef.current.annotations.highlight(
            cfi,
            {},
            () => {
              setActiveAnnotation({ annotation: annotationSnapshot });
              setPendingSelection(null);
            },
            'hl',
            { fill: HIGHLIGHT_COLORS[color], 'fill-opacity': '1' }
          );
        } catch {
          // non-fatal
        }
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

      if (renditionRef.current) {
        try {
          renditionRef.current.annotations.remove(annotation.cfi, 'highlight');
          const updatedSnapshot = updated;
          renditionRef.current.annotations.highlight(
            updated.cfi,
            {},
            () => {
              setActiveAnnotation({ annotation: updatedSnapshot });
              setPendingSelection(null);
            },
            'hl',
            { fill: HIGHLIGHT_COLORS[color], 'fill-opacity': '1' }
          );
        } catch {
          // non-fatal
        }
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

    if (renditionRef.current) {
      try {
        renditionRef.current.annotations.remove(annotation.cfi, 'highlight');
      } catch {
        // non-fatal
      }
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
      setBookBuffer(null);
      setAnnotations([]);
      setPendingSelection(null);
      setActiveAnnotation(null);
      renditionRef.current = null;
      pendingCfiRef.current = null;

      try {
        const bookId = await computeBookId(file);
        currentBookIdRef.current = bookId;

        try {
          await cacheEpubBlob(bookId, file);
        } catch {
          // non-fatal
        }

        const buffer = await file.arrayBuffer();

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
          await upsertReadingProgress(user.id, bookId, {
            bookTitle,
            bookAuthor: null,
            coverUrl: null,
            fileUrl: resolvedFileUrl,
            fileName: file.name,
            cfi: savedCfi,
            percentage: savedPercentage || null,
          });
        } catch {
          // non-fatal
        }

        let startLocation: string | number = 0;
        if (savedCfi) {
          startLocation = savedCfi;
          pendingCfiRef.current = savedCfi;
          currentCfiRef.current = savedCfi;
          currentPercentageRef.current = savedPercentage;
          setState(s => ({ ...s, currentCfi: savedCfi, percentage: savedPercentage }));
        }

        setLocation(startLocation);
        setBookBuffer(buffer);

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
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to open EPUB.';
        setState(s => ({ ...s, isLoading: false, error: msg }));
      }
    },
    [user]
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

    renditionRef.current = null;
    currentBookIdRef.current = null;
    currentCfiRef.current = null;
    currentPercentageRef.current = 0;
    pendingCfiRef.current = null;
    setBookBuffer(null);
    setLocation(0);
    setAnnotations([]);
    setPendingSelection(null);
    setActiveAnnotation(null);
    setState(initialState);
  }, [user]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!renditionRef.current || !state.isLoaded) return;
    const rendition = renditionRef.current;
    rendition.themes.fontSize(`${fontSize}%`);
    const cssFamily = FONT_FAMILY_MAP[fontFamily] ?? 'inherit';
    rendition.themes.default({
      'p, div, span, h1, h2, h3, h4, h5, h6, a, li': {
        'font-family': cssFamily === 'inherit' ? 'inherit' : `${cssFamily} !important`,
        'line-height': '1.6 !important',
      },
    });
  }, [fontSize, fontFamily, state.isLoaded]);

  const handleSetReadMode = useCallback(
    (newMode: ReadMode) => {
      const latestCfi = renditionRef.current?.location?.start?.cfi;
      if (latestCfi) {
        setLocation(latestCfi);
        currentCfiRef.current = latestCfi;
      }
      setReadMode(newMode);
    },
    []
  );

  return {
    state,
    location,
    bookUrl: bookBuffer,
    onLocationChanged,
    getRendition,
    renditionRef,
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
    readMode,
    setReadMode: handleSetReadMode,
    fontSize,
    setFontSize,
    fontFamily,
    setFontFamily,
  };
}
