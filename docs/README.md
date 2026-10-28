# Cockpit Mountain documentation

This folder is the documentation index and decision log. Reusable guides live
in [`../forks/guidance-focused/guides/`](../forks/guidance-focused/guides/),
and runnable examples live in [`../examples/`](../examples/).

- `decisions/`: dependency policy, compatibility exceptions, and migration
  records.
- `PROJECTS.md`: project index with workspace paths and build entrypoints.

Refactored code lives on each repository's `main`; the prior code is preserved
on `deprecated/pre-refactor` (or the existing repository-specific legacy branch).

Keep one authored guide per topic. Add a runnable example only when executable
code helps teach the task; link to it from the guide instead of duplicating it.
