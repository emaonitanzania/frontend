// src/main.jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { startBackendHeartbeat } from './services/backendHeartbeat';

if (import.meta.env.VITE_ENABLE_BACKEND_HEARTBEAT === 'true') {
  startBackendHeartbeat();
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
