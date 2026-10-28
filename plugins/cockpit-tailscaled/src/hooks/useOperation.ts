import { useCallback, useState } from 'react';

export interface Operation {
    pending: boolean;
    error: string | null;
    run: (action: () => Promise<void>) => Promise<boolean>;
}

/** Small helper to track pending/error state of an async action. */
export function useOperation(): Operation {
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const run = useCallback(async (action: () => Promise<void>) => {
        setPending(true);
        setError(null);
        try {
            await action();
            return true;
        } catch (exc) {
            setError(exc instanceof Error ? exc.message : String(exc));
            return false;
        } finally {
            setPending(false);
        }
    }, []);

    return { pending, error, run };
}
