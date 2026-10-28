// SPDX-License-Identifier: LGPL-2.1-or-later
import React, { act, createRef, StrictMode, Suspense } from "react";
import cockpit from "cockpit";
import { createRoot } from "react-dom/client";
import { createRoot as createCockpitRoot } from "react-root";

import QUnit from "qunit-tests";
import { EventEmitter } from "cockpit/event";
import { useEvent, useOn } from "hooks";
import { WithDialogs, useDialogs, type Dialogs } from "dialogs";
import { TypeaheadSelect } from "cockpit-components-typeahead-select";
import { MultiTypeaheadSelect } from "cockpit-components-multi-typeahead-select";
import { ListingPanel } from "cockpit-components-listing-panel";
import { FileAutoComplete } from "cockpit-components-file-autocomplete";
import { LogsPanel } from "cockpit-components-logs-panel";
import { journal } from "journal";

declare global {
    var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

class Store extends EventEmitter<{ changed(): void }> {
    value = 0;
    subscriptions = 0;

    override on(event: "changed", listener: () => void) {
        const off = super.on(event, listener);
        this.subscriptions++;
        let active = true;
        return () => {
            if (active) {
                active = false;
                this.subscriptions--;
                off();
            }
        };
    }

    increment() {
        this.value++;
        this.emit("changed");
    }
}

QUnit.test("React subscriptions survive StrictMode effect replay", async assert => {
    const store = new Store();
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    function Counter() {
        useOn(store, "changed");
        return <span>{store.value}</span>;
    }
    try {
        await act(() => root.render(<StrictMode><Counter /></StrictMode>));
        assert.strictEqual(store.subscriptions, 1, "exactly one committed subscription");
        await act(() => store.increment());
        assert.strictEqual(container.textContent, "1", "external updates reach React after effect replay");
    } finally {
        await act(() => root.unmount());
        container.remove();
    }
    assert.strictEqual(store.subscriptions, 0, "unmount removes subscriptions");
});

QUnit.test("React suspended renders do not subscribe to external stores", async assert => {
    const store = new Store();
    const container = document.createElement("div");
    const root = createRoot(container);
    const pending = new Promise<never>(() => {});
    function Suspended(): React.ReactNode {
        useOn(store, "changed");
        throw pending;
    }
    try {
        await act(() => root.render(<Suspense fallback="loading"><Suspended /></Suspense>));
        assert.strictEqual(container.textContent, "loading", "render was suspended");
        assert.strictEqual(store.subscriptions, 0, "uncommitted render has no listeners");
    } finally {
        await act(() => root.unmount());
    }
    assert.strictEqual(store.subscriptions, 0, "abandoned render leaves no listeners");
});

QUnit.test("React dialog context keeps a stable interface", async assert => {
    const container = document.createElement("div");
    const root = createRoot(container);
    const contexts: Dialogs[] = [];
    function Consumer() {
        contexts.push(useDialogs());
        return <span>ready</span>;
    }
    try {
        await act(() => root.render(<WithDialogs><Consumer /></WithDialogs>));
        const dialogs = contexts[0];
        await act(() => dialogs.show(<span>dialog</span>));
        assert.true(dialogs.isActive(), "retained interface reports the active dialog");
        assert.strictEqual(container.textContent, "readydialog", "dialog is rendered");
        assert.true(contexts.every(context => context === dialogs), "dialog updates preserve the context interface");
        await act(() => dialogs.close());
        assert.false(dialogs.isActive(), "retained interface reports a closed dialog");
        assert.strictEqual(container.textContent, "ready", "dialog closes");
    } finally {
        await act(() => root.unmount());
    }
});

QUnit.test("React application render failures have a recovery screen", async assert => {
    const container = document.createElement("div");
    const error = new TypeError("Cannot read properties of null (reading 'useState')");
    const root = createCockpitRoot(container, {
        onCaughtError: caught => assert.strictEqual(caught, error, "original error remains available to diagnostics")
    });
    function Broken(): React.ReactNode {
        throw error;
    }
    try {
        await act(() => root.render(<Broken />));
        assert.ok(container.querySelector('[role="alert"]'), "render failure is visible");
        assert.strictEqual(container.querySelector("button")?.textContent, "Reload", "page offers a recovery action");
    } finally {
        await act(() => root.unmount());
    }
});

QUnit.test("React legacy event subscriptions survive replay and use current handlers", async assert => {
    const source = cockpit.event_target<{ value: number }, { changed(): void }>({ value: 0 });
    const container = document.createElement("div");
    const root = createRoot(container);
    const seen: number[] = [];
    function Counter({ multiplier }: { multiplier: number }) {
        useEvent(source, "changed", () => seen.push(multiplier));
        return <span>{source.value * multiplier}</span>;
    }
    try {
        await act(() => root.render(<StrictMode><Counter multiplier={1} /></StrictMode>));
        await act(() => {
            source.value++;
            source.dispatchEvent("changed");
        });
        assert.strictEqual(container.textContent, "1", "legacy event reaches committed component");
        await act(() => root.render(<StrictMode><Counter multiplier={2} /></StrictMode>));
        await act(() => source.dispatchEvent("changed"));
        assert.deepEqual(seen, [1, 2], "handler sees current props without duplicate listeners");
    } finally {
        await act(() => root.unmount());
    }
    source.dispatchEvent("changed");
    assert.deepEqual(seen, [1, 2], "unmount removes legacy listeners");
});

QUnit.test("React 19 select refs and accessible IDs work across instances", async assert => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    const single = createRef<HTMLDivElement>();
    const multiple = createRef<HTMLDivElement>();
    try {
        await act(() => root.render(<>
            <TypeaheadSelect ref={single} selectOptions={[]} />
            <MultiTypeaheadSelect ref={multiple} options={[]} selected={[]} onAdd={() => {}} onRemove={() => {}} />
        </>));
        const toggles = container.querySelectorAll<HTMLButtonElement>(".pf-v6-c-menu-toggle__button");
        await act(() => toggles[0].click());
        assert.ok(single.current, "open single select exposes its menu ref");
        const listboxId = container.querySelector('[role="combobox"]')?.getAttribute("aria-controls");
        assert.ok(listboxId, "combobox identifies its listbox");
        assert.strictEqual(document.getElementById(listboxId!)?.getAttribute("role"), "listbox",
                           "controlled element has the listbox role");
        await act(() => toggles[1].click());
        assert.ok(multiple.current, "open multiple select exposes its menu ref");
        const ids = [...container.querySelectorAll('[role="combobox"]')].map(input => input.getAttribute("aria-controls"));
        assert.strictEqual(ids.length, 2, "both inputs expose their listboxes");
        assert.notEqual(ids[0], ids[1], "listbox IDs are unique per instance");
    } finally {
        await act(() => root.unmount());
        container.remove();
    }
});

QUnit.test("React listing panels do not render a zero for an empty tab list", async assert => {
    const container = document.createElement("div");
    const root = createRoot(container);
    try {
        await act(() => root.render(<ListingPanel />));
        assert.strictEqual(container.textContent, "", "empty listing has no stray text");
    } finally {
        await act(() => root.unmount());
    }
});

QUnit.test("React file autocomplete releases its channel and ignores late replies", async assert => {
    const original = cockpit.channel;
    const channel = cockpit.event_target<{ closed: boolean; close(): void }, {
        ready(): void;
        close(options: cockpit.JsonObject): void;
        message(data: string): void;
    }>({ closed: false, close() { this.closed = true } });
    Object.defineProperty(cockpit, "channel", { value: () => channel });
    const root = createRoot(document.createElement("div"));
    let changes = 0;
    try {
        await act(() => root.render(<FileAutoComplete isOptionCreatable={false} onlyDirectories={false}
                                                     onChange={() => changes++} />));
        const initialChanges = changes;
        await act(() => root.unmount());
        assert.true(channel.closed, "unmount closes the filesystem listing channel");
        channel.dispatchEvent("ready");
        assert.strictEqual(changes, initialChanges, "late results cannot notify an unmounted input");
    } finally {
        await act(() => root.unmount());
        Object.defineProperty(cockpit, "channel", { value: original });
    }
});

QUnit.test("React log panels retain equivalent queries and release changed queries", async assert => {
    const original = journal.journalctl;
    const streams: { stopped: boolean; stream(): void; stop(): void }[] = [];
    Object.defineProperty(journal, "journalctl", { value: () => {
        const stream = { stopped: false, stream() {}, stop() { this.stopped = true } };
        streams.push(stream);
        return stream;
    } });
    const root = createRoot(document.createElement("div"));
    try {
        await act(() => root.render(<LogsPanel match={["UNIT=first"]} max={10} title="Logs" />));
        await act(() => root.render(<LogsPanel match={["UNIT=first"]} max={10} title="Logs" />));
        assert.strictEqual(streams.length, 1, "equivalent arrays retain the stream");
        await act(() => root.render(<LogsPanel match={["UNIT=second"]} max={10} title="Logs" />));
        assert.true(streams[0].stopped, "a changed query stops the previous stream");
        assert.strictEqual(streams.length, 2, "new query opens a stream");
        await act(() => root.unmount());
        assert.true(streams[1].stopped, "unmount stops the active stream");
    } finally {
        await act(() => root.unmount());
        Object.defineProperty(journal, "journalctl", { value: original });
    }
});

QUnit.start();
