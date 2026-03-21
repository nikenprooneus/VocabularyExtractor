let loadPromise: Promise<void> | null = null;

export function ensureFoliateLoaded(): Promise<void> {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    if (customElements.get('foliate-view')) {
      resolve();
      return;
    }

    const existing = document.querySelector('script[data-foliate-view]');
    if (!existing) {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/foliate-js/view.js';
      script.dataset.foliateView = 'true';
      script.onerror = () => {
        loadPromise = null;
        reject(new Error('Failed to load foliate-js/view.js'));
      };
      document.head.appendChild(script);
    }

    customElements
      .whenDefined('foliate-view')
      .then(() => resolve())
      .catch(reject);
  });

  return loadPromise;
}

let overlayerPromise: Promise<{ highlight: (rects: unknown, opts: unknown) => unknown }> | null = null;

export function ensureOverlayerLoaded(): Promise<{ highlight: (rects: unknown, opts: unknown) => unknown }> {
  if (overlayerPromise) return overlayerPromise;

  overlayerPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-foliate-overlayer]');
    if (!existing) {
      const script = document.createElement('script');
      script.type = 'module';
      script.textContent = `
        import { Overlayer } from '/foliate-js/overlayer.js';
        window.__FoliateOverlayer = Overlayer;
      `;
      script.dataset.foliateOverlayer = 'true';
      script.onerror = () => {
        overlayerPromise = null;
        reject(new Error('Failed to load foliate-js/overlayer.js'));
      };
      document.head.appendChild(script);
    }

    const poll = () => {
      if ((window as unknown as { __FoliateOverlayer?: unknown }).__FoliateOverlayer) {
        resolve((window as unknown as { __FoliateOverlayer: { highlight: (rects: unknown, opts: unknown) => unknown } }).__FoliateOverlayer);
      } else {
        setTimeout(poll, 20);
      }
    };
    poll();
  });

  return overlayerPromise;
}
