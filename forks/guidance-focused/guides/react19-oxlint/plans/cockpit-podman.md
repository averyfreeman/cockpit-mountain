# Cockpit Podman migration plan

## Scope

- Move React and React DOM to 19.3.1 and React types to 19.3.0.
- Upgrade PatternFly packages to 6.7.0, `argparse` to 3.0.4, and
  `gettext-parser` to 10.0.0. Keep TypeScript at 6.0.3 and Node.js at `>=24`.
- Replace ESLint with Oxlint, set TypeScript and esbuild to the automatic JSX
  runtime, and remove React imports that only served the old JSX transform.
- Give selectable `CardHeader` controls an accessible name through
  `selectableActions.selectableActionAriaLabel`; PatternFly 6.7 reports an
  accessibility error when a selectable card omits it.
- Keep the mutable terminal buffer callback on the terminal instance instead
  of in React state. Preserve plugin coverage for React hooks, TypeScript,
  accessibility, imports, promises, and Node.

## Validation

- Run `npm run lint`, TypeScript checking, and Stylelint.
- Run `make codecheck` and development and production builds.
- Run `check-application`, including container operations, logs, and terminal
  attach/detach behavior.
- Confirm React renders without runtime exceptions or outdated JSX transform
  warnings and that Oxlint is not in runtime output.
