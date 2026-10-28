# Cockpit React 19 and Oxlint refactor kit

This folder tracks the coordinated React 19 and Oxlint migration for
`cockpit-machines`, `cockpit-podman`, and `cockpit-starter-kit`, along with the
shared Cockpit static-code check that those projects use from `make codecheck`.

## Migration sequence

1. Make the shared `test/common/static-code` helper invoke Oxlint.
2. Update each app's `COCKPIT_REPO_COMMIT` to a Cockpit revision containing that
   helper, then migrate the app's dependencies, JSX transforms, and lint config.
3. Verify lint, type checking, `make codecheck`, development and production
   builds, and the project's application tests. Project-specific coverage is in
   the plans below.

The shared helper was migrated in Cockpit revision
[`5fef24e3435d7940a9a3ff9ed7c30d700d960a4a`](https://github.com/averyfreeman/cockpit/commit/5fef24e3435d7940a9a3ff9ed7c30d700d960a4a).
The app Makefiles pin to its React 19 follow-up,
[`64ed0b09ff51d7de34d89bcf22549d6e335c4ca1`](https://github.com/averyfreeman/cockpit/commit/64ed0b09ff51d7de34d89bcf22549d6e335c4ca1),
which also updates shared UI types for React 19. They fetch from the public
Cockpit fork because the canonical `cockpit-project/cockpit` pin still uses
ESLint. Once the
helper revision is available upstream, switch `COCKPIT_REPO_URL` back to the
canonical repository and update the pin to its upstream hash.

## Shared policy

- Use React and React DOM 19.3.1, React type packages 19.3.0, and PatternFly
  6.7.0 where each project uses those packages.
- Keep TypeScript on 6.0.3 while TypeScript 7 support remains outside this
  migration. Use Node.js `>=24` for local builds and CI.
- Pin direct dependencies to exact stable versions. Refresh packages that have
  a compatible stable update, including major updates where the app's build and
  types remain compatible.
- Let `npm install` generate `package-lock.json` locally. The three app repos
  ignore that file; do not commit it.
- Keep Oxlint in development dependencies only. It must not enter runtime
  package output.
- Set TypeScript JSX to `react-jsx` and esbuild JSX to `automatic`, then remove
  default React imports used only by the classic JSX transform.

## Plans

- [Machines](plans/cockpit-machines.md)
- [Podman](plans/cockpit-podman.md)
- [Starter Kit](plans/cockpit-starter-kit.md)
- [Dependency matrix](DEPENDENCY_MATRIX.md)

## Test matrix

| Repo | Static and build checks | Browser application checks |
|---|---|---|
| Machines | `npm run lint`, `make codecheck` (includes the TypeScript checker), development and production builds, `make all` for runtime package metadata | `make check` runs the full VM/browser suite, including VM creation, lifecycle, storage, network, and consoles |
| Podman | Same checks | `make check` runs `test/check-application`, including containers, images, logs, and terminal attach/detach |
| Starter Kit | Same checks | `make check` runs `test/check-application` against the generated starter app |

`make codecheck` skips the optional Ruff, mypy, and Vulture checks when those
Python tools are unavailable.

## References

- [React 19 upgrade guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)
- [React reference](https://react.dev/reference/react)
- [Oxlint migration from ESLint](https://oxc.rs/docs/guide/usage/linter/migrate-from-eslint.html)
- [Oxlint built-in plugins](https://oxc.rs/docs/guide/usage/linter/plugins.html)
- [PatternFly release highlights](https://www.patternfly.org/releases/release-highlights/)
- [PatternFly React support](https://www.patternfly.org/get-started/develop/)
