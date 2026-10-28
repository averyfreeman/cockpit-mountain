import { useEffect, useState } from 'react';

/*
 * Tracks whether the current Cockpit session may open superuser channels.
 * null means "still initializing".
 */
export function useSuperuser(): boolean | null {
    const [allowed, setAllowed] = useState<boolean | null>(() => {
        const permission = cockpit.permission({ admin: true });
        return permission.allowed;
    });

    useEffect(() => {
        const permission = cockpit.permission({ admin: true });
        setAllowed(permission.allowed);
        const update = () => setAllowed(permission.allowed);
        permission.addEventListener('changed', update);
        return () => permission.removeEventListener('changed', update);
    }, []);

    return allowed;
}
