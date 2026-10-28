/*
 * Minimal typings for the subset of the Cockpit JavaScript API used by
 * this application. The runtime is provided by ../base1/cockpit.js which
 * Cockpit injects into every page.
 *
 * Reference: https://cockpit-project.org/guide/latest/cockpit-spawn.html
 */

declare namespace Cockpit {
    interface SpawnOptions {
        /** "require" fails if superuser is not available, "try" attempts it */
        superuser?: 'try' | 'require';
        host?: string;
        directory?: string;
        /** "out" merges stderr into stdout, "ignore" discards it */
        err?: 'out' | 'ignore' | 'message';
        environ?: string[];
        pty?: boolean;
    }

    interface ProcessFailureException {
        message?: string;
        problem?: string;
        exit_status?: number;
        exit_signal?: string;
        toString(): string;
    }

    /**
     * cockpit.spawn() returns a promise resolving with the collected
     * standard output of the process.
     */
    type SpawnPromise = Promise<string> & {
        stream(callback: (data: string) => void): SpawnPromise;
    };

    interface Permission {
        allowed: boolean | null;
        user?: string | null;
        addEventListener(event: 'changed', callback: () => void): void;
        removeEventListener(event: 'changed', callback: () => void): void;
        close(): void;
    }

    interface UserInfo {
        id: number;
        name: string;
        full_name: string;
        groups: string[];
        home: string;
        shell: string;
    }

    interface CockpitObject {
        spawn(args: string[], options?: SpawnOptions): SpawnPromise;

        permission(options?: { admin?: boolean }): Permission;

        user(): Promise<UserInfo>;

        /** Drop-in i18n helper provided by base1; falls back to identity */
        gettext(key: string): string;
        ngettext(key1: string, keyN: string, n: number): string;

        info(message?: string): void;
        warn(message?: string): void;
        error(message?: Error | string): void;

        /** Version of Cockpit itself, e.g. "365" */
        version: string;
    }
}

declare var cockpit: Cockpit.CockpitObject;
