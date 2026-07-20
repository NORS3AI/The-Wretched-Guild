import './app.css';
import { mount } from 'svelte';
import App from './App.svelte';

// Never fail silently to a blank page: surface any error ON SCREEN so it can be
// read and fixed, instead of a mysterious white/blank page.
function showError(where: string, detail: unknown): void {
  const msg = detail instanceof Error ? detail.stack || detail.message : String(detail);
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML =
      '<div style="padding:24px;color:#e8dcc4;font-family:Georgia,serif;max-width:760px;margin:40px auto;">' +
      '<h2 style="color:#c04a3f;margin:0 0 8px;">The Wretched Guild hit an error</h2>' +
      '<p style="color:#a99b80;margin:0 0 12px;">Please copy this and send it so it can be fixed:</p>' +
      '<pre style="white-space:pre-wrap;background:#1e1812;padding:12px;border-radius:6px;border:1px solid #3a2f22;overflow:auto;font-size:12px;">' +
      (where + ': ' + msg).replace(/</g, '&lt;') +
      '</pre></div>';
  }
  document.getElementById('loading')?.remove();
}

window.addEventListener('error', (e) => showError('runtime', e.error ?? e.message));
window.addEventListener('unhandledrejection', (e) => showError('promise', (e as PromiseRejectionEvent).reason));

let app: ReturnType<typeof mount> | undefined;
try {
  app = mount(App, { target: document.getElementById('app')! });
  // Mounted successfully — clear the static loading indicator.
  document.getElementById('loading')?.remove();
} catch (e) {
  showError('mount', e);
}

export default app;
