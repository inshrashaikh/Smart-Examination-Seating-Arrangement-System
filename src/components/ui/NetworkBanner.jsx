import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { WifiOff, RefreshCw, X } from 'lucide-react';
import { API_ORIGIN, isApiReachable, onNetworkDown, onNetworkUp } from '../../services/api';

/**
 * Network-down banner.
 *
 * `api.js` flips a flag whenever a request fails with no HTTP response (JVM
 * stopped, wrong port, laptop asleep). This component listens for that flag,
 * renders a dismissible banner with a Retry button, and keeps probing
 * `/api/health` every 10s so the banner disappears on its own once the backend
 * comes back — no page reload required.
 *
 * Mounted once, in App, above the router so it overlays every route.
 */
const POLL_MS = 10_000;

export default function NetworkBanner() {
  const [down, setDown] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    onNetworkDown(() => {
      setDown(true);
      setDismissed(false);
    });
    onNetworkUp(() => setDown(false));
    return () => {
      onNetworkDown(null);
      onNetworkUp(null);
    };
  }, []);

  // While the banner is up, poll so it clears itself once the API is back.
  useEffect(() => {
    if (!down) return undefined;
    let cancelled = false;

    const probe = async () => {
      const alive = await isApiReachable();
      if (!cancelled && alive) setDown(false);
    };

    const id = setInterval(probe, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [down]);

  const retry = useCallback(async () => {
    setChecking(true);
    const alive = await isApiReachable();
    setChecking(false);
    if (alive) {
      setDown(false);
      // The in-memory caches may be stale; a reload is the honest reset.
      window.location.reload();
    }
  }, []);

  const visible = down && !dismissed;

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          role="alert"
          className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-3 bg-rose-600 px-4 py-2.5 text-white shadow-soft-lg"
        >
          <WifiOff className="h-4 w-4 shrink-0" />
          <p className="min-w-0 text-[13px] font-semibold">
            <span className="hidden sm:inline">Cannot reach the backend at </span>
            <code className="rounded bg-white/20 px-1.5 py-0.5 font-mono text-[12px]">{API_ORIGIN}</code>
            <span className="hidden sm:inline">. Start it with </span>
            <code className="hidden rounded bg-white/20 px-1.5 py-0.5 font-mono text-[12px] sm:inline">
              mvn spring-boot:run
            </code>
          </p>
          <button
            type="button"
            onClick={retry}
            disabled={checking}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white/20 px-2.5 py-1 text-[12px] font-bold transition-colors hover:bg-white/30 disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${checking ? 'animate-spin' : ''}`} />
            {checking ? 'Checking…' : 'Retry'}
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
            className="shrink-0 rounded-lg p-1 transition-colors hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export { NetworkBanner };
