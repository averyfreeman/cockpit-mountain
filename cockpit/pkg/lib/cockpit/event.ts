/*
 * Copyright (C) 2024 Red Hat, Inc.
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export class EventEmitter<EM extends { [E in keyof EM]: (...args: never[]) => void }> {
    #listeners: { [E in keyof EM]?: EM[E][] } = {};
    #versions: { [E in keyof EM]?: number } = {};

    public getVersion<E extends keyof EM>(event: E): number {
        return this.#versions[event] ?? 0;
    }

    public on<E extends keyof EM>(event: E, listener: EM[E]) {
        const listeners = this.#listeners[event] ||= [];
        listeners.push(listener);
        let active = true;
        return () => {
            if (active) {
                active = false;
                listeners.splice(listeners.indexOf(listener), 1);
            }
        };
    }

    protected emit<E extends keyof EM>(event: E, ...args: Parameters<EM[E]>) {
        this.#versions[event] = this.getVersion(event) + 1;
        // Subscription cleanup during a notification must not skip the next listener.
        for (const listener of [...this.#listeners[event] || []]) {
            listener(...args);
        }
    }
}
