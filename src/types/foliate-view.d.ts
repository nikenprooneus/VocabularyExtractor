interface FoliateRelocateDetail {
  cfi: string;
  fraction: number;
}

interface FoliateRelocateEvent extends CustomEvent {
  detail: FoliateRelocateDetail;
}

interface FoliateBookMetadata {
  title?: string;
  author?: string;
  identifier?: string;
  cover?: string;
}

interface FoliateBookTocItem {
  label: string;
  href: string;
  subitems?: FoliateBookTocItem[];
}

interface FoliateViewElement extends HTMLElement {
  open(file: File): Promise<void>;
  init(options: { lastLocation?: string }): void;
  next(): void;
  prev(): void;
  goTo(cfiOrHref: string): void;
  book: {
    metadata: FoliateBookMetadata;
    toc: FoliateBookTocItem[];
  };
  addEventListener(
    type: 'relocate',
    listener: (event: FoliateRelocateEvent) => void,
    options?: boolean | AddEventListenerOptions
  ): void;
  removeEventListener(
    type: 'relocate',
    listener: (event: FoliateRelocateEvent) => void,
    options?: boolean | EventListenerOptions
  ): void;
}

declare namespace JSX {
  interface IntrinsicElements {
    'foliate-view': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
  }
}
