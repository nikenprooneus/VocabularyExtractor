import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import type { AnnotationColor } from '../../types';

export interface FoliateLocation {
  cfi: string | null;
  fraction: number;
  index: number;
  range?: Range;
}

export interface FoliateRelocateDetail {
  cfi: string | null;
  fraction: number;
  index: number;
  range?: Range;
  tocItem?: { label: string; href: string } | null;
}

export interface FoliateLoadDetail {
  doc: Document;
  index: number;
}

export interface FoliateViewHandle {
  open: (file: File) => Promise<void>;
  close: () => void;
  prev: () => Promise<void>;
  next: () => Promise<void>;
  goTo: (target: string | number) => Promise<void>;
  init: (opts: { lastLocation?: string | null; showTextStart?: boolean }) => Promise<void>;
  addAnnotation: (value: string, color: AnnotationColor) => void;
  removeAnnotation: (value: string) => void;
  getBookMetadata: () => { title: string; author: string; toc: FoliaTocItem[] } | null;
  setFlow: (flow: 'paginated' | 'scrolled') => void;
  setFontSize: (size: number) => void;
  setFontFamily: (family: string) => void;
}

export interface FoliaTocItem {
  label: string;
  href: string;
  subitems?: FoliaTocItem[];
}

interface FoliateViewProps {
  onRelocate?: (detail: FoliateRelocateDetail) => void;
  onLoad?: (detail: FoliateLoadDetail) => void;
  onSelection?: (detail: { cfi: string; text: string; contextText: string }) => void;
  onAnnotationClick?: (value: string) => void;
  onBookReady?: (detail: { title: string; author: string; toc: FoliaTocItem[] }) => void;
  onReady?: () => void;
  annotations?: Array<{ id: string; cfi: string; color: AnnotationColor }>;
  flow?: 'paginated' | 'scrolled';
  fontSize?: number;
  fontFamily?: string;
}

const FONT_FAMILY_MAP: Record<string, string> = {
  'System Default': 'inherit',
  'Serif': 'Georgia, "Times New Roman", serif',
  'Sans-Serif': 'Arial, Helvetica, sans-serif',
  'Monospace': '"Courier New", "Lucida Console", monospace',
};

const HIGHLIGHT_COLORS: Record<AnnotationColor, string> = {
  yellow: 'rgba(253, 224, 71, 0.55)',
  green:  'rgba(134, 239, 172, 0.55)',
  blue:   'rgba(147, 197, 253, 0.55)',
  pink:   'rgba(249, 168, 212, 0.55)',
  gray:   'rgba(169, 169, 169, 0.55)',
};

const BOOK_STYLES = `
  html, body {
    background: #1c1a18 !important;
    color: #faf9f7 !important;
    font-size: 1rem;
    line-height: 1.75;
    padding: 0;
    margin: 0;
  }
  a { color: #c9a96e !important; text-decoration: underline; }
  a:hover { color: #d4b47a !important; }
  p { margin: 0 0 0.9em 0; }
  h1, h2, h3, h4, h5, h6 { color: #faf9f7 !important; }
  img, svg { max-width: 100% !important; height: auto !important; }
  * { -webkit-user-select: text !important; user-select: text !important; }
`;

function normalizeAuthor(author: unknown): string {
  if (!author) return '';
  if (typeof author === 'string') return author;
  if (typeof author === 'object' && author !== null) {
    const a = author as Record<string, unknown>;
    if (a.name && typeof a.name === 'string') return a.name;
    const vals = Object.values(a);
    if (vals.length > 0 && typeof vals[0] === 'string') return vals[0];
  }
  if (Array.isArray(author)) {
    const first = (author as unknown[])[0];
    return normalizeAuthor(first);
  }
  return String(author);
}

function extractToc(items: unknown[]): FoliaTocItem[] {
  if (!Array.isArray(items)) return [];
  return items.map((item: unknown) => {
    const t = item as Record<string, unknown>;
    return {
      label: (typeof t.label === 'string' ? t.label : '').trim(),
      href: typeof t.href === 'string' ? t.href : '',
      subitems: t.subitems ? extractToc(t.subitems as unknown[]) : undefined,
    };
  }).filter(item => item.label);
}

export const FoliateView = forwardRef<FoliateViewHandle, FoliateViewProps>(
  function FoliateView(
    { onRelocate, onLoad, onSelection, onAnnotationClick, onBookReady, onReady,
      flow = 'paginated', fontSize = 100, fontFamily = 'System Default' },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<HTMLElement | null>(null);
    const pendingFlowRef = useRef<'paginated' | 'scrolled'>(flow);
    const pendingFontSizeRef = useRef<number>(fontSize);
    const pendingFontFamilyRef = useRef<string>(fontFamily);
    const annotationColorsRef = useRef<Map<string, AnnotationColor>>(new Map());
    const isOpenRef = useRef(false);

    const applyRendererStyle = (renderer: HTMLElement) => {
      renderer.setAttribute('flow', pendingFlowRef.current);
      renderer.setAttribute('gap', '5%');
      renderer.setAttribute('max-inline-size', '720');
      renderer.setAttribute('margin', '10');
      const container = containerRef.current;
      if (container) {
        const h = container.getBoundingClientRect().height;
        if (h > 0) {
          renderer.setAttribute('max-block-size', `${Math.floor(h - 20)}px`);
        }
      }
    };

    const updateBlockSize = () => {
      const container = containerRef.current;
      if (!container) return;
      const h = container.getBoundingClientRect().height;
      if (h <= 0) return;
      const view = viewRef.current as unknown as {
        renderer?: HTMLElement & { setAttribute: (k: string, v: string) => void };
      };
      if (view?.renderer) {
        view.renderer.setAttribute('max-block-size', `${Math.floor(h - 20)}px`);
      }
    };

    const injectBookStyles = (doc: Document, override?: { fontSize?: number; fontFamily?: string }) => {
      const existingStyle = doc.getElementById('foliate-reader-styles');
      if (existingStyle) existingStyle.remove();
      const style = doc.createElement('style');
      style.id = 'foliate-reader-styles';
      const fs = override?.fontSize ?? pendingFontSizeRef.current;
      const ff = FONT_FAMILY_MAP[override?.fontFamily ?? pendingFontFamilyRef.current] ?? 'inherit';
      const familyRule = ff === 'inherit' ? '' : `
        p, div, span, li, blockquote, td, th {
          font-family: ${ff} !important;
        }
      `;
      style.textContent = `
        ${BOOK_STYLES}
        :root { font-size: ${fs}% !important; }
        ${familyRule}
      `;
      doc.head.appendChild(style);
    };

    const injectSelectionHandler = (doc: Document) => {
      let selectionCache: { text: string; range: Range; contextText: string } | null = null;

      const tryFireSelection = () => {
        if (!selectionCache) return;
        try {
          const sel = doc.defaultView?.getSelection();
          const currentText = sel?.toString().trim() ?? '';
          if (!currentText || !selectionCache) {
            selectionCache = null;
            return;
          }

          const viewEl = viewRef.current as unknown as {
            getCFI?: (index: number, range: Range) => string;
            renderer?: { getContents?: () => Array<{ index: number; doc: Document }> };
          };
          const contents = viewEl?.renderer?.getContents?.() ?? [];
          const found = contents.find((c) => c.doc === doc);
          if (!found) { selectionCache = null; return; }

          const cfi = viewEl.getCFI?.(found.index, selectionCache.range) ?? null;
          if (cfi && onSelection) {
            onSelection({ cfi, text: selectionCache.text, contextText: selectionCache.contextText });
          }
          selectionCache = null;
        } catch {
          selectionCache = null;
        }
      };

      doc.addEventListener('selectionchange', () => {
        try {
          const sel = doc.defaultView?.getSelection();
          if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
            selectionCache = null;
            return;
          }
          const text = sel.toString().trim();
          if (!text) { selectionCache = null; return; }
          const range = sel.getRangeAt(0).cloneRange();
          const contextText = range.commonAncestorContainer?.textContent?.trim() ?? text;
          selectionCache = { text, range, contextText };
        } catch {
          // non-fatal
        }
      });

      doc.addEventListener('mouseup', () => {
        setTimeout(tryFireSelection, 50);
      });

      doc.addEventListener('touchend', () => {
        setTimeout(tryFireSelection, 300);
      }, { passive: true });
    };

    useImperativeHandle(ref, () => ({
      async open(file: File) {
        const view = viewRef.current as unknown as {
          open?: (file: File) => Promise<void>;
          renderer?: HTMLElement & { setAttribute: (k: string, v: string) => void };
        };
        if (!view?.open) return;
        isOpenRef.current = false;
        await view.open(file);
        if (view.renderer) {
          applyRendererStyle(view.renderer);
        }
        isOpenRef.current = true;
      },
      close() {
        const view = viewRef.current as unknown as { close?: () => void };
        view?.close?.();
        isOpenRef.current = false;
        annotationColorsRef.current.clear();
      },
      async prev() {
        const view = viewRef.current as unknown as { prev?: () => Promise<void> };
        await view?.prev?.();
      },
      async next() {
        const view = viewRef.current as unknown as { next?: () => Promise<void> };
        await view?.next?.();
      },
      async goTo(target: string | number) {
        const view = viewRef.current as unknown as { goTo?: (t: string | number) => Promise<void> };
        await view?.goTo?.(target);
      },
      async init(opts: { lastLocation?: string | null; showTextStart?: boolean }) {
        const view = viewRef.current as unknown as { init?: (o: object) => Promise<void> };
        await view?.init?.(opts);
      },
      addAnnotation(value: string, color: AnnotationColor) {
        annotationColorsRef.current.set(value, color);
        const view = viewRef.current as unknown as {
          addAnnotation?: (ann: { value: string }) => void;
        };
        view?.addAnnotation?.({ value });
      },
      removeAnnotation(value: string) {
        annotationColorsRef.current.delete(value);
        const view = viewRef.current as unknown as {
          deleteAnnotation?: (ann: { value: string }) => void;
        };
        view?.deleteAnnotation?.({ value });
      },
      getBookMetadata() {
        const view = viewRef.current as unknown as {
          book?: {
            metadata?: Record<string, unknown>;
            toc?: unknown[];
          };
        };
        if (!view?.book) return null;
        const metadata = view.book.metadata ?? {};
        const rawTitle = metadata.title;
        const title = typeof rawTitle === 'string'
          ? rawTitle
          : rawTitle && typeof rawTitle === 'object'
            ? String(Object.values(rawTitle)[0] ?? '')
            : '';
        const authors = metadata.author ?? metadata.creator;
        const author = Array.isArray(authors)
          ? authors.map(normalizeAuthor).join(', ')
          : normalizeAuthor(authors);
        const toc = extractToc((view.book.toc as unknown[]) ?? []);
        return { title, author, toc };
      },
      setFlow(flow: 'paginated' | 'scrolled') {
        pendingFlowRef.current = flow;
        const view = viewRef.current as unknown as {
          renderer?: HTMLElement & { setAttribute: (k: string, v: string) => void };
        };
        if (view?.renderer) {
          view.renderer.setAttribute('flow', flow);
        }
      },
      setFontSize(size: number) {
        pendingFontSizeRef.current = size;
        const view = viewRef.current as unknown as {
          renderer?: { getContents?: () => Array<{ doc: Document }> };
        };
        view?.renderer?.getContents?.()?.forEach(({ doc }) => {
          injectBookStyles(doc, { fontSize: size });
        });
      },
      setFontFamily(family: string) {
        pendingFontFamilyRef.current = family;
        const view = viewRef.current as unknown as {
          renderer?: { getContents?: () => Array<{ doc: Document }> };
        };
        view?.renderer?.getContents?.()?.forEach(({ doc }) => {
          injectBookStyles(doc, { fontFamily: family });
        });
      },
    }));

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      let mounted = true;
      let viewEl: HTMLElement | null = null;

      const init = async () => {
        const dynamicImport = new Function('url', 'return import(url)');
        await dynamicImport('/foliate/view.js');
        if (!mounted) return;

        viewEl = document.createElement('foliate-view');
        Object.assign(viewEl.style, {
          display: 'block',
          width: '100%',
          height: '100%',
        });

        viewEl.addEventListener('relocate', (e: Event) => {
          const detail = (e as CustomEvent).detail as {
            cfi?: string;
            fraction?: number;
            index?: number;
            range?: Range;
            tocItem?: { label: string; href: string } | null;
          };
          onRelocate?.({
            cfi: detail.cfi ?? null,
            fraction: detail.fraction ?? 0,
            index: detail.index ?? 0,
            range: detail.range,
            tocItem: detail.tocItem,
          });
        });

        viewEl.addEventListener('load', (e: Event) => {
          const detail = (e as CustomEvent).detail as { doc: Document; index: number };
          injectBookStyles(detail.doc);
          injectSelectionHandler(detail.doc);
          onLoad?.({ doc: detail.doc, index: detail.index });

          if (!isOpenRef.current) {
            const vv = viewEl as unknown as {
              book?: { metadata?: Record<string, unknown>; toc?: unknown[] };
            };
            if (vv?.book && onBookReady) {
              isOpenRef.current = true;
              const metadata = vv.book.metadata ?? {};
              const rawTitle = metadata.title;
              const title = typeof rawTitle === 'string' ? rawTitle
                : rawTitle && typeof rawTitle === 'object' ? String(Object.values(rawTitle)[0] ?? '')
                : '';
              const authors = metadata.author ?? metadata.creator;
              const author = Array.isArray(authors)
                ? authors.map(normalizeAuthor).join(', ')
                : normalizeAuthor(authors);
              const toc = extractToc((vv.book.toc as unknown[]) ?? []);
              onBookReady({ title, author, toc });
            }
          }
        });

        viewEl.addEventListener('draw-annotation', (e: Event) => {
          const detail = (e as CustomEvent).detail as {
            draw: (func: (rects: DOMRectList, opts: object) => SVGElement, opts: object) => void;
            annotation: { value: string };
          };
          const color = annotationColorsRef.current.get(detail.annotation.value) ?? 'yellow';
          detail.draw(
            (rects: DOMRectList, _opts: object) => {
              const ns = 'http://www.w3.org/2000/svg';
              const g = document.createElementNS(ns, 'g');
              g.setAttribute('fill', HIGHLIGHT_COLORS[color]);
              for (const { left, top, height, width } of rects) {
                const rect = document.createElementNS(ns, 'rect');
                rect.setAttribute('x', String(left));
                rect.setAttribute('y', String(top));
                rect.setAttribute('height', String(height));
                rect.setAttribute('width', String(width));
                g.appendChild(rect);
              }
              return g;
            },
            {}
          );
        });

        viewEl.addEventListener('show-annotation', (e: Event) => {
          const detail = (e as CustomEvent).detail as { value: string; index: number };
          onAnnotationClick?.(detail.value);
        });

        container.appendChild(viewEl);
        viewRef.current = viewEl;

        if (mounted) {
          onReady?.();
        }
      };

      init().catch(console.error);

      const resizeObserver = new ResizeObserver(() => {
        updateBlockSize();
      });
      resizeObserver.observe(container);

      return () => {
        mounted = false;
        resizeObserver.disconnect();
        if (viewEl) {
          try {
            (viewEl as unknown as { close?: () => void }).close?.();
          } catch {
            // non-fatal
          }
          viewEl.remove();
        }
        viewRef.current = null;
      };
    }, []);

    useEffect(() => {
      pendingFlowRef.current = flow;
      const view = viewRef.current as unknown as {
        renderer?: HTMLElement & { setAttribute: (k: string, v: string) => void };
      };
      if (view?.renderer) {
        view.renderer.setAttribute('flow', flow);
      }
    }, [flow]);

    useEffect(() => {
      pendingFontSizeRef.current = fontSize;
      const view = viewRef.current as unknown as {
        renderer?: { getContents?: () => Array<{ doc: Document }> };
      };
      view?.renderer?.getContents?.()?.forEach(({ doc }) => {
        injectBookStyles(doc, { fontSize });
      });
    }, [fontSize]);

    useEffect(() => {
      pendingFontFamilyRef.current = fontFamily;
      const view = viewRef.current as unknown as {
        renderer?: { getContents?: () => Array<{ doc: Document }> };
      };
      view?.renderer?.getContents?.()?.forEach(({ doc }) => {
        injectBookStyles(doc, { fontFamily });
      });
    }, [fontFamily]);

    return (
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', background: '#1c1a18', display: 'block' }}
      />
    );
  }
);
