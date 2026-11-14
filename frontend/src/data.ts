import { useEffect, useState } from 'react';

const embedded = document.getElementById('trajviz-data');
export const isOffline = Boolean(embedded);
let offlineFiles: Record<string, string> | undefined;
const cache = new Map<string, Promise<unknown>>();

export function invalidateData() {
  cache.clear();
  window.dispatchEvent(new Event('trajviz-data-updated'));
}

function parsePayload(raw: string) {
  // Keep exact integer tokens when they cannot fit in a JavaScript number.
  if (/\d{16}/.test(raw)) {
    raw = raw.replace(/"(?:\\.|[^"\\])*"|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/g, (token) =>
      /^-?\d{16,}$/.test(token) && !Number.isSafeInteger(Number(token)) ? JSON.stringify(token) : token);
  }
  return JSON.parse(raw);
}

export function readData<T>(relativePath: string): Promise<T> {
  const previous = cache.get(relativePath);
  if (previous) return previous as Promise<T>;

  const request = Promise.resolve().then(async () => {
    if (embedded) {
      offlineFiles ??= JSON.parse(embedded.textContent ?? '').files;
      const payload = offlineFiles && Object.hasOwn(offlineFiles, relativePath)
        ? document.getElementById(offlineFiles[relativePath]) : null;
      if (!payload) {
        throw new Error(`Embedded data is missing ${relativePath}.`);
      }
      return parsePayload(payload.textContent ?? '');
    }

    const base = new URL('/data/', window.location.origin);
    const url = new URL(relativePath, base);
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) {
      throw new Error(`Invalid dataset path: ${relativePath}`);
    }
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${relativePath} returned HTTP ${response.status}.`);
    return parsePayload(await response.text());
  }).catch((error: unknown) => {
    cache.delete(relativePath);
    throw error;
  });

  cache.set(relativePath, request);
  return request as Promise<T>;
}

type State<T> =
  | { status: 'idle' | 'loading' }
  | { status: 'ready'; data: T; warning?: string }
  | { status: 'error'; message: string };

export function useResource<T>(paths: readonly string[], single = false) {
  const key = JSON.stringify(paths);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const update = () => setAttempt((value) => value + 1);
    window.addEventListener('trajviz-data-updated', update);
    return () => window.removeEventListener('trajviz-data-updated', update);
  }, []);
  const [result, setResult] = useState<{ key: string; attempt: number; state: State<T> }>();

  useEffect(() => {
    const files: string[] = JSON.parse(key);
    if (!files.length) return;
    let active = true;
    const request = single ? readData<T>(files[0]) : Promise.all(files.map(readData)) as Promise<T>;
    request.then(
      (data) => { if (active) setResult({ key, attempt, state: { status: 'ready', data } }); },
      (error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        if (active) setResult((previous) => previous?.key === key && previous.state.status === 'ready'
          ? { key, attempt, state: { ...previous.state, warning: message } }
          : { key, attempt, state: { status: 'error', message } });
      },
    );
    return () => { active = false; };
  }, [key, attempt, single]);

  const state: State<T> = !paths.length ? { status: 'idle' }
    : result?.key === key && (result.attempt === attempt || result.state.status === 'ready') ? result.state : { status: 'loading' };
  return { state, retry: () => setAttempt((value) => value + 1) };
}

export function useStored<T extends string>(key: string, initial: T, values: readonly T[]) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key) as T | null;
      return stored && values.includes(stored) ? stored : initial;
    } catch {
      return initial;
    }
  });

  function update(next: T) {
    setValue(next);
    try { localStorage.setItem(key, next); } catch { /* In-memory state works on file URLs. */ }
  }

  return [value, update] as const;
}
