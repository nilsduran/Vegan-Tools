import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress benign Vite WebSocket errors
const originalConsoleError = console.error;
console.error = (...args) => {
  const msg = args.join(' ');
  if (msg.includes('WebSocket closed') || msg.includes('[vite] failed to connect')) {
    return;
  }
  originalConsoleError(...args);
};

window.addEventListener('error', (e) => {
  if (e.message?.includes('WebSocket closed') || e.message?.includes('[vite] failed to connect')) {
    e.preventDefault();
    e.stopImmediatePropagation();
  }
}, { capture: true });

window.addEventListener('unhandledrejection', (e) => {
  const reason = e.reason?.message || e.reason?.toString() || '';
  if (reason.includes('WebSocket closed') || reason.includes('[vite] failed to connect')) {
    e.preventDefault();
    e.stopImmediatePropagation();
  }
}, { capture: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
