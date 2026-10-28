# Cockpit Mountain

Cockpit Mountain brings Cockpit core and its separately packaged modules into one
workspace. The name fits the project: a mountain of web modules with shared
tooling where the projects are compatible.

## Layout

- `cockpit/` is the Cockpit core and shared platform code.
- `plugins/` contains the Cockpit modules, each retaining its own packaging and
  project documentation.
- `examples/` contains runnable teaching projects.
- `docs/` is the documentation index, dependency decisions, and project
  index.
- `forks/guidance-focused/` is the single home for reusable Cockpit module
  guides and migration lessons.

## Development

Use Node.js 24 or newer and pnpm 12.9.1. The workspace uses one lockfile and
shared dependency catalogs for compatible React, PatternFly, TypeScript, Vite,
and Oxlint versions. Framework or package-version exceptions stay local to the
packages that need them.

```sh
pnpm install --frozen-lockfile
pnpm run list:projects
pnpm run lint
pnpm run test
pnpm run build
```

Cockpit packages also keep their usual Makefile and distribution entrypoints;
see `docs/PROJECTS.md` for the per-project build notes and upstream mapping.

## Guidance

Start at [`docs/README.md`](docs/README.md). Reusable module guidance lives
in [`forks/guidance-focused/`](forks/guidance-focused/), and runnable teaching
material lives under `examples/`.
