# Foliate-JS Local Vendoring & Integration Plan

## Context & Architecture
We have completely removed the NPM/CDN version of `foliate-js` and `epubjs`. To solve the Vite Web Worker path resolution issues and achieve the smooth paginated/scrolled rendering of the original Foliate engine, we have manually vendored the foliate-js source code into our local repository at:
`src/lib/foliate-js/`

## Strict Rules for Bolt (AI Agent)

**1. IMPORT LOCALLY, NO NPM:**
You MUST NOT use `npm install foliate-js` or import from unpkg/jsdelivr. 
All imports must target our local vendored directory.
Example: `import '../lib/foliate-js/view.js';`

**2. VITE WEB WORKER RESOLUTION (CRITICAL):**
Foliate-js relies on web workers (specifically `epub.js`) to parse books without blocking the main thread. Because Vite alters paths during build, if `view.js` fails to spawn the worker internally, you must manually resolve the worker URL and pass it to the Foliate constructor/setup if the API allows, OR ensure that `src/lib/foliate-js/` is treated as a raw asset directory if necessary. 
*Note: Modern Vite usually handles `new Worker(new URL('./epub.js', import.meta.url))` natively inside the vendored `view.js` if kept in the same folder.*

**3. COMPONENT REWRITE (`useEpubReader.ts` & `EpubReader.tsx`):**
- Revert the renderer back to `<foliate-view ref={viewerRef}></foliate-view>` or instantiate the Foliate View class dynamically and attach it to a div, depending on how our vendored `view.js` exports its interface (usually it defines a custom web component `<foliate-view>`).
- Restore the `relocate` event listeners to update reading progress.
- Keep all existing UI components (Toolbar, Footer, TOC Sidebar, Background colors) EXACTLY as they are. ONLY swap the engine engine.

**4. TYPESCRIPT BYPASS:**
Since the vendored `.js` files lack type definitions, aggressively use `// @ts-ignore` or declare generic any types for the Foliate modules to prevent the Vite build from failing due to strict TS checks.
