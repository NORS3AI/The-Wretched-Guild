import { build } from 'esbuild';
import esbuildSvelte from 'esbuild-svelte';
import { JSDOM } from 'jsdom';

const res = await build({
  entryPoints: ['src/main.ts'],
  bundle: true, write: false, format: 'esm', platform: 'browser', logLevel: 'silent',
  loader: { '.css': 'empty' },
  plugins: [esbuildSvelte({ compilerOptions: { generate: 'client', dev: true } })],
  outfile: 'out.js',
});
const code = res.outputFiles[0].text;

const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
const { window } = dom;
// expose ALL window globals (Text, Comment, DocumentFragment, HTMLElement, ...) to node global
for (const k of Object.getOwnPropertyNames(window)) {
  if (k in globalThis) continue;
  try { Object.defineProperty(globalThis, k, { get: () => window[k], configurable: true }); } catch {}
}
try { Object.defineProperty(globalThis, 'window', { value: window, configurable: true }); } catch {}
try { Object.defineProperty(globalThis, 'document', { value: window.document, configurable: true }); } catch {}
if (!globalThis.requestAnimationFrame) globalThis.requestAnimationFrame = (cb)=>setTimeout(()=>cb(Date.now()),0);

try {
  const dataUrl = 'data:text/javascript;base64,' + Buffer.from(code).toString('base64');
  await import(dataUrl);
  await new Promise(r => setTimeout(r, 400));
  const app = window.document.getElementById('app');
  console.log('MOUNT OK — #app innerHTML length:', app.innerHTML.length);
  console.log('has topbar?', app.innerHTML.includes('Wretched'));
} catch (e) {
  console.log('MOUNT ERROR:\n' + (e && (e.stack || e.message) || e));
}
process.exit(0);
