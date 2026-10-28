# Cockpit Mountain guidance

This folder is the one home for reusable Cockpit module guidance. Start with the
topic guides under [`guides/`](guides/); runnable code stays under the root
[`examples/`](../../examples/) directory, and project snapshots stay beside
this folder under `forks/`.

Use this convention for new material:

- Put one focused guide in `guides/<topic>/` when it needs several related
  files, or `guides/<topic>.md` when it is a single page.
- Give each guide a clear task, prerequisites, copyable commands, and a check
  that confirms completion.
- Put executable demonstrations in `examples/<name>/`, with a README and an
  isolated package manifest when needed. Link to them from the guide.
- Keep one maintained copy of each guide or example. Never use this folder as a
  second project checkout or a place for build artifacts.

## Guides

- [Refactoring Cockpit modules](guides/refactoring-cockpit-modules.md):
  practical order of operations and checks.
- [React 19 and Oxlint migration kit](guides/react19-oxlint/README.md):
  project plans, dependency notes, and verification matrix.
- [Lessons learned](guides/lessons-learned.md): reusable findings from this
  workspace migration.
