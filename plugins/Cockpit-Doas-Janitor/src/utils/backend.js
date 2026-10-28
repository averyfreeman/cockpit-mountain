/*
 * utils/backend.js
 * Cockpit spawn wrapper (React-safe)
 */

"use strict";

const PYTHON  = "/usr/bin/python3";
const BACKEND = "/usr/share/cockpit/sudo-manager/backend/sudo-manager.py";

export async function spawnBackend(args) {
  return cockpit.spawn(
    [PYTHON, BACKEND, ...args],
    {
      superuser: "require",
      err: "message",
    }
  );
}
