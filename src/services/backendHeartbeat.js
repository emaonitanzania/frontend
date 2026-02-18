const DEFAULT_HEARTBEAT_URL = 'https://backend-2yju.onrender.com';
const MIN_INTERVAL_MS = 10000;
const MAX_INTERVAL_MS = 300000;

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const HEARTBEAT_URL =
  import.meta.env.VITE_BACKEND_HEARTBEAT_URL || DEFAULT_HEARTBEAT_URL;
const HEARTBEAT_INTERVAL_MS = clamp(
  toNumber(import.meta.env.VITE_BACKEND_HEARTBEAT_INTERVAL_MS, 60000),
  MIN_INTERVAL_MS,
  MAX_INTERVAL_MS,
);
const HEARTBEAT_TIMEOUT_MS = clamp(
  toNumber(import.meta.env.VITE_BACKEND_HEARTBEAT_TIMEOUT_MS, 8000),
  1000,
  30000,
);

let started = false;
let timerId = null;
let failureCount = 0;

const getNextDelay = () => {
  const cappedFailures = Math.min(failureCount, 4);
  return HEARTBEAT_INTERVAL_MS * Math.pow(2, cappedFailures);
};

const scheduleNextPing = () => {
  if (!started) return;
  const delay = getNextDelay();
  timerId = window.setTimeout(runHeartbeat, delay);
};

const runHeartbeat = async () => {
  if (!started) return;

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), HEARTBEAT_TIMEOUT_MS);

  try {
    await fetch(HEARTBEAT_URL, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-store',
      keepalive: true,
      signal: controller.signal,
    });
    failureCount = 0;
  } catch (error) {
    failureCount += 1;
    console.warn(`[heartbeat] request failed (${failureCount})`, error);
  } finally {
    window.clearTimeout(timeoutId);
    scheduleNextPing();
  }
};

export const startBackendHeartbeat = () => {
  if (started) return;
  started = true;
  runHeartbeat();
};

export const stopBackendHeartbeat = () => {
  started = false;
  failureCount = 0;
  if (timerId !== null) {
    window.clearTimeout(timerId);
    timerId = null;
  }
};
