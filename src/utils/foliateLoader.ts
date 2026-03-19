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
