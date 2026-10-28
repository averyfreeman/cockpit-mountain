import { useCallback, useEffect, useRef, useState } from 'react';

import { ClientPrefs, TailscaleStatus } from '../types';
import {
    getStatus,
    getPrefs,
    getVersion,
    isVersionSupported,
    mapPrefs,
    parseVersion,
} from '../services/tailscale';

export interface TailscaleData {
    status: TailscaleStatus | null;
    prefs: ClientPrefs | null;
    version: string | null;
    versionSupported: boolean;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

/**
 * Polls the tailscale daemon for status and preferences.
 * Reads run without superuser rights; when the current unix user is not
 * the tailscale operator this may fail, which is reported via `error`.
 */
export function useTailscaleData(pollMs = 15000): TailscaleData {
    const [status, setStatus] = useState<TailscaleStatus | null>(null);
    const [prefs, setPrefs] = useState<ClientPrefs | null>(null);
    const [version, setVersion] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const inFlight = useRef(false);

    const refresh = useCallback(async () => {
        if (inFlight.current)
            return;
        inFlight.current = true;
        try {
            /* Version only needs to be fetched once */
            if (version === null) {
                try {
                    const v = await getVersion();
                    setVersion(v.majorMinorPatch);
                } catch {
                    setVersion(null);
                }
            }
            const st = await getStatus();
            setStatus(st);
            try {
                const raw = await getPrefs();
                setPrefs(mapPrefs(raw));
            } catch (exc) {
                /* status worked but prefs failed - keep old prefs */
                console.warn('failed to read tailscale prefs', exc);
            }
            setError(null);
        } catch (exc) {
            setError(exc instanceof Error ? exc.message : String(exc));
        } finally {
            inFlight.current = false;
            setLoading(false);
        }
    }, [version]);

    useEffect(() => {
        void refresh();
        const timer = window.setInterval(() => void refresh(), pollMs);
        return () => window.clearInterval(timer);
    }, [refresh, pollMs]);

    return {
        status,
        prefs,
        version,
        versionSupported: isVersionSupported(version),
        loading,
        error,
        refresh,
    };
}

/* Re-exported for convenience of callers building version strings */
export { parseVersion };
