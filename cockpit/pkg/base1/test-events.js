// SPDX-License-Identifier: LGPL-2.1-or-later
import cockpit from "cockpit";
import QUnit from "qunit-tests";
import { EventEmitter } from "cockpit/event";

QUnit.test("event dispatch", function (assert) {
    const obj = { };
    cockpit.event_target(obj);

    let count = 0;
    function handler(ev) {
        if (count === 0) {
            assert.equal(typeof ev, "object", "event is object");
            assert.equal(ev.type, "action", "event.type is 'action'");
            assert.equal(ev.data, "Data", "event.data is set");
        }
        count += 1;
    }

    const ev = new Event("action", { bubbles: false, cancelable: false });
    ev.data = "Data";

    obj.dispatchEvent(ev);
    assert.strictEqual(count, 0, "count is zero");

    obj.onaction = handler;
    obj.dispatchEvent(ev);
    assert.strictEqual(count, 1, "count is one");

    obj.addEventListener("action", handler, true);
    obj.dispatchEvent(ev);
    assert.strictEqual(count, 3, "count is three");

    obj.addEventListener("action", handler, true);
    obj.dispatchEvent(ev);
    assert.strictEqual(count, 6, "count is six");

    obj.removeEventListener("action", handler, true);
    obj.dispatchEvent(ev);
    assert.strictEqual(count, 8, "count is eight");

    obj.onaction = null;
    obj.dispatchEvent(ev);
    assert.strictEqual(count, 9, "count is nine");

    obj.removeEventListener("action", handler, true);
    obj.dispatchEvent(ev);
    assert.strictEqual(count, 9, "count is still nine");
});

QUnit.test("event emitter cleanup is idempotent during notification", assert => {
    /** @extends {EventEmitter<{ changed(): void }>} */
    class Emitter extends EventEmitter {
        notify() {
            this.emit("changed");
        }
    }
    const emitter = new Emitter();
    let count = 0;
    const off = emitter.on("changed", () => off());
    emitter.on("changed", () => count++);
    assert.strictEqual(emitter.getVersion("changed"), 0, "initial revision");
    emitter.notify();
    assert.strictEqual(count, 1, "self-removal does not skip the next listener");
    off();
    emitter.notify();
    assert.strictEqual(count, 2, "repeated removal does not remove another listener");
    assert.strictEqual(emitter.getVersion("changed"), 2, "revision advances with every notification");
});

QUnit.start();
