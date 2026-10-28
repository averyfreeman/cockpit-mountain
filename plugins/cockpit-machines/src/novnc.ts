/*
 * SPDX-License-Identifier: LGPL-2.1-or-later
 *
 * Copyright (C) 2026 Red Hat, Inc.
 */

import type NoVncClient from '@novnc/novnc/lib/rfb';

// noVNC 1.7 exposes a runtime root entry, while its type package only declares the legacy subpath.
// @ts-expect-error noVNC does not publish a root TypeScript declaration
import RFB from '@novnc/novnc';

const RFB_constructor: typeof NoVncClient = RFB;

export default RFB_constructor;
