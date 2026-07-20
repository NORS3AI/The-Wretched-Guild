import './app.css';
import { mount } from 'svelte';
import App from './App.svelte';

const app = mount(App, {
  target: document.getElementById('app')!,
});

// Remove the static loading indicator once the app has mounted. If the page
// stays stuck on "Loading the gutter…", the JS bundle failed to load/run.
document.getElementById('loading')?.remove();

export default app;
