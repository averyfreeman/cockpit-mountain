import { useCallback, useState } from 'react';

/**
 * Boolean preference persisted in the browser's localStorage.
 * Falls back to the default when storage is unavailable.
 */
export function useLocalPreference(key: string, defaultValue: boolean): [boolean, (value: boolean) => void] {
    const [value, setValue] = useState(() => {
        try {
            const raw = window.localStorage.getItem(key);
            return raw === null ? defaultValue : raw === 'true';
        } catch {
            return defaultValue;
        }
    });

    const update = useCallback((next: boolean) => {
        setValue(next);
        try {
            window.localStorage.setItem(key, String(next));
        } catch {
            /* storage unavailable; keep the in-memory value */
        }
    }, [key]);

    return [value, update];
}
