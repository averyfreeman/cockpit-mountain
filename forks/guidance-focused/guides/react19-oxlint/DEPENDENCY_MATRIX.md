# Dependency matrix

Versions reflect stable npm registry releases checked on 2026-10-27. Package
versions are exact pins in each repo's `package.json`; generated lock files stay
ignored.

| Area | Machines | Podman | Starter Kit |
|---|---|---|---|
| Node.js floor | `>=24` | `>=24` | `>=24` |
| React / React DOM | `19.3.1` | `19.3.1` | `19.3.1` |
| React type packages | `@types/react` `19.3.0`; `@types/react-dom` `19.3.0` | Same | Same |
| TypeScript | `6.0.3` | `6.0.3` | `6.0.3` |
| Oxlint | `1.89.0` dev dependency | `1.89.0` dev dependency | `1.90.0` dev dependency |
| PatternFly | Core, CSS, icons, styles, table, tokens `6.7.0` | Core, CSS, icons, styles, table, tokens `6.7.0` | Core, CSS, icons, styles `6.7.0` |
| Additional refreshed runtime packages | `@novnc/novnc` `1.7.0`; `argparse` `3.0.4`; `gettext-parser` `10.0.0` | `argparse` `3.0.4`; `gettext-parser` `10.0.0` | `argparse` `3.0.4`; `gettext-parser` `10.0.0` |
| Additional refreshed dev packages | `@types/novnc__novnc` `1.6.0` | — | — |

The Cockpit Mountain catalog resolves Oxlint to `1.90.0` across the workspace.
The standalone Machines and Podman repositories keep `1.89.0` because their
committed `node_modules` cache was generated from that exact manifest; upgrading
those standalone pins requires a matching cache update.

Other direct dependencies were checked against the registry and are already at
their latest compatible stable versions. TypeScript remains on major 6 by
policy. React 19 requires the automatic JSX transform; TypeScript and esbuild
are configured accordingly.

## Cockpit helper pin

All three Makefiles pin `test/common/static-code` to
`64ed0b09ff51d7de34d89bcf22549d6e335c4ca1`, fetched from the public fork URL
`https://github.com/averyfreeman/cockpit.git`. Its parent introduced the
Oxlint helper, and it updates shared UI types for React 19. The app Makefiles
should return to `https://github.com/cockpit-project/cockpit.git` when these
revisions are available from upstream.
