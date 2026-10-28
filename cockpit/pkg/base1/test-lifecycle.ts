// SPDX-License-Identifier: LGPL-2.1-or-later
import QUnit from "qunit-tests";
import cockpit from "cockpit";
import { transport_globals, type Transport } from "cockpit/_internal/transport";
import { Router } from "../shell/router";

QUnit.test("pagehide closes the document transport once without reporting failure", assert => {
    const savedTransport = transport_globals.default_transport;
    const savedExpectation = transport_globals.expect_disconnect;
    let closed = 0;
    transport_globals.default_transport = { close: () => closed++ } as unknown as Transport;
    transport_globals.expect_disconnect = false;
    try {
        window.dispatchEvent(new PageTransitionEvent("pagehide", { persisted: true }));
        assert.strictEqual(closed, 1, "document lifecycle closes the transport exactly once");
        assert.true(transport_globals.expect_disconnect, "navigation is treated as an expected disconnect");
    } finally {
        transport_globals.default_transport = savedTransport;
        transport_globals.expect_disconnect = savedExpectation;
    }
});

QUnit.test("shell router releases a child frame on pagehide", assert => {
    const originalFilter = Object.getOwnPropertyDescriptor(cockpit.transport, "filter")!;
    const originalWait = Object.getOwnPropertyDescriptor(cockpit.transport, "wait")!;
    const originalKill = Object.getOwnPropertyDescriptor(cockpit, "kill")!;
    const killed: string[] = [];
    Object.defineProperty(cockpit.transport, "filter", { value: () => {} });
    Object.defineProperty(cockpit.transport, "wait", { value: (callback: () => void) => callback() });
    Object.defineProperty(cockpit, "kill", { value: (_host: null, group: string) => killed.push(group) });
    const frame = document.createElement("iframe");
    frame.name = "cockpit1:localhost/system/test";
    document.body.append(frame);
    const child = frame.contentWindow!;
    try {
        const router = new Router({
            perform_frame_hash_track() {},
            frame_is_initialized() {},
        });
        window.dispatchEvent(new MessageEvent("message", {
            origin: window.location.origin,
            source: child,
            data: '\n{"command":"init","version":1}',
        }));
        child.dispatchEvent(new PageTransitionEvent("pagehide"));
        assert.deepEqual(killed, [frame.name], "navigation releases the child's channel group");
        router.unregister_name(frame.name);
        assert.strictEqual(killed.length, 1, "pagehide unregisters the child exactly once");
    } finally {
        frame.remove();
        Object.defineProperty(cockpit.transport, "filter", originalFilter);
        Object.defineProperty(cockpit.transport, "wait", originalWait);
        Object.defineProperty(cockpit, "kill", originalKill);
    }
});

QUnit.start();
