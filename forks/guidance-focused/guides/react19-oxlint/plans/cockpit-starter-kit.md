# Cockpit Starter Kit migration plan

## Scope

- Upgrade PatternFly packages to 6.7.0 and React / React DOM to 19.3.1 with
  React types 19.3.0.
- Refresh `argparse` to 3.0.4 and `gettext-parser` to 10.0.0. Keep TypeScript at
  6.0.3 and Node.js `>=24`.
- Replace ESLint with Oxlint, set TypeScript and esbuild to the automatic JSX
  runtime, and remove React imports used only by the classic JSX transform.
- Preserve Stylelint and the starter kit's generated, ignored package-lock
  convention. Update the README lint instructions.

## Validation

- Run `npm run lint`, TypeScript checking, and Stylelint.
- Run `make codecheck`, development and production builds, and
  `check-application` for the generated starter application.
- Confirm the generated app runs under Node 24 or later without React runtime
  errors or outdated JSX transform warnings, and that Oxlint is not in runtime
  output.
