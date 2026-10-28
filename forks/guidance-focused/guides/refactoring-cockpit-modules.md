# Refactoring Cockpit modules

## Start with the package and its host contract

Read the module README, Makefile, package manifest, packaging metadata, tests,
and Cockpit APIs it imports before changing the frontend. Keep the module's
installation path, D-Bus or HTTP contract, translations, and distribution
metadata intact. Record which upstream project the snapshot came from.

## Modernize in small, verifiable steps

1. Make the working tree clean and record the upstream base.
2. Update the dependency and lint configuration, then run the existing build.
3. Port React roots and lifecycle behavior before raising React's major version.
4. Replace legacy bundlers with Vite when the module's asset handling and
   Cockpit packaging can be preserved. Keep a purpose-built builder only when
   a demonstrated packaging constraint requires it.
5. Run the module's lint, type, build, and test commands after each logical
   change. Build and inspect a distribution package when packaging files change.
6. Keep generated bundles, dependency directories, and package artifacts out of
   Git unless the upstream module intentionally tracks them.

## React lifecycle checks

- Create one root per mount point and reuse it for updates.
- Pair subscriptions, observers, timers, and event listeners with cleanup.
- Guard asynchronous initialization against completion after unmount.
- Test loading, failure, reconnect, and unmount paths where the module has them.
- Preserve keyboard interaction, focus handling, and the existing PatternFly
  components and visual treatment during a tooling migration.

## Package and workspace checks

- Use the root pnpm workspace and frozen lockfile in Cockpit Mountain.
- Keep common dependencies on the workspace catalog; document only verified
  compatibility exceptions.
- Keep project-specific Makefile, Debian, RPM, and CI commands usable from the
  module directory.
- Preserve upstream licenses and attribution when importing code or
  submodules.
