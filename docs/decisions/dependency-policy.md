# Dependency policy

Cockpit Mountain is the canonical working tree. Use Node.js 24 or newer and
pnpm 12.9.1. The workspace lockfile is the dependency source of truth.

The default catalog aligns compatible React packages on React 19, PatternFly
6.7, TypeScript 6, Oxlint 1.90, Vite 8, esbuild 0.28, and gettext-parser 10.
Packages that cannot use one of those versions keep an explicit, narrow exception with the reason
documented here and in their package metadata. Use the root pnpm lockfile for
workspace installs; keep independent module manifests and packaging entrypoints.

The `vendor/houston-common` git submodule is maintained by 45Drives and keeps
its own lint toolchain. Its Vue ESLint config requests ESLint 9 or 10 while the
submodule pins ESLint 8.57.1. The workspace permits that exact mismatch only
for this upstream config package; no Cockpit Mountain package uses ESLint as
its lint runner.

Vite is the default for standalone plugin frontends. Cockpit core's custom
esbuild pipeline remains its own build entrypoint while its Debian/RPM packaging
is evaluated against the workspace install; it is not a reason for plugins to
retain Webpack. Vue remains supported as a project-level framework and uses the
same pnpm workspace.

## Exceptions to review

| Package | Exception | Reason | Revisit when |
| --- | --- | --- | --- |
| Cockpit core | Existing esbuild packaging integration | Distro packages derive runtime module metadata from the current build pipeline. | Keep validating the root workspace against source and Debian/RPM builds. |
| Vue ESLint config in Houston Common | ESLint 8.57.1 peer exception | The vendor submodule still pins 8.57.1; root Oxlint does not replace its own upstream toolchain. | Revisit when the vendor updates its configuration and lint stack. |
| Tailscaled | PatternFly 5.4 and React 18.3 | Its vendored SCSS imports `@patternfly/patternfly/base/patternfly-themes.scss`, which PatternFly 6 no longer provides. | Revisit after replacing or migrating the vendored SCSS. |
| Legacy package versions | Package-specific version | Required only where a module cannot pass its build on the shared catalog. | Remove after migration and verification. |

Pnpm shares package content in its store, and the catalog also keeps compatible
direct dependencies on the same versions. Each module still declares packages
it imports because its bundle and standalone packaging need a complete,
reviewable dependency contract. Some upstream build tools expect npm's flat
`node_modules` layout; workspace adapters should resolve the actual bundled
packages without weakening dependency isolation for every project.
