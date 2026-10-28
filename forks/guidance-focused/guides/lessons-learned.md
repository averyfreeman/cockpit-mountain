# Lessons from refactoring Cockpit modules

Treat a Cockpit module as both a frontend and a system package. Its browser
bundle, translations, static-code checks, Debian/RPM metadata, runtime module
list, and host-facing Cockpit API contract all need to survive a tooling update.

Before copying completed work between repositories, compare the source and
target base commits and review staged, unstaged, and untracked files together.
Apply the changes on the target's current upstream base so the port keeps newer
security, test, and CI updates. A copied working tree does not carry the source
repository's useful history; commit the target changes on its own branch and
preserve the former default branch before moving refactored code to `main`.

Keep generated bundles, Debian artifacts, and dependency directories out of
the source transfer. Preserve a tracked lockfile when the target keeps the same
package manager; regenerate it when the target package metadata changes. Build a
fresh package from the target checkout and inspect its package name, version,
architecture, dependencies, and installed files. This catches stale artifacts
and packaging rules that work only in the source tree.

For a monorepo, share versions and package storage where compatibility is
proven, but leave each module's packaging boundary visible. A single lockfile
does not make every indirect dependency a direct import, and it does not remove
the need for module-specific build adapters when upstream scripts assume a
flat npm dependency layout.
