import { useEffect, useState } from 'react';
import { createLiveLoop, type LiveTopic } from '../live/iotLive';

/**
 * Polls several endpoints together (refreshed early by matching realtime topics) and parses
 * them as one snapshot. Any failure keeps the last good snapshot but marks it unavailable,
 * so the screen never mixes fresh and failed data silently.
 */
export function useLive<T>(urls: string[], parse: (values: unknown[]) => T, topics: LiveTopic[], interval = 5000, refresh = 0) {
  const [data, setData] = useState<T | null>(null);
  const [available, setAvailable] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const key = urls.join('|');
  useEffect(() => {
    let active = true; let controller: AbortController | undefined;
    const loop = createLiveLoop(topics, interval);
    const poll = async () => {
      controller = new AbortController(); const timeout = setTimeout(() => controller?.abort(), 5000);
      try {
        const values = await Promise.all(urls.map(async url => {
          const response = await fetch(url, { signal: controller!.signal, cache: 'no-store' });
          if (!response.ok) throw new Error(String(response.status));
          return response.json();
        }));
        const parsed = parse(values);
        if (active) { setData(parsed); setAvailable(true); }
      } catch { if (active) setAvailable(false); }
      finally { clearTimeout(timeout); if (active) { setLoaded(true); loop.next(poll); } }
    };
    void poll();
    return () => { active = false; loop.dispose(); controller?.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, refresh]);
  return { data, available, loaded };
}
