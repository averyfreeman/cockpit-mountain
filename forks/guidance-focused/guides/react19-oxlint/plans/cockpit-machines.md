# Cockpit Machines migration plan

## Scope

- Move React and React DOM to 19.3.1 and React types to 19.3.0.
- Upgrade PatternFly packages to 6.7.0, noVNC to 1.7.0 and its types to 1.6.0,
  `argparse` to 3.0.4, and `gettext-parser` to 10.0.0.
- Keep TypeScript at 6.0.3; set the Node.js floor to `>=24`.
- Replace ESLint with Oxlint, set TypeScript and esbuild to the automatic JSX
  runtime, and remove React imports that only served the old JSX transform.
- Target ES2022 and emit an ES module in Machines because noVNC 1.7 uses
  top-level `await`.
- Preserve React, TypeScript, accessibility, import, promise, and Node lint
  coverage with native Oxlint plugins. Keep Stylelint as the CSS linter.
- Use PatternFly's `FormGroup.ouiaId` prop for stable OUIA field identifiers;
  forwarding `data-ouia-component-id` does not preserve the ID in PatternFly 6.7.

## Validation

- Run `npm run lint`, TypeScript checking, and Stylelint.
- Run `make codecheck` using the shared Oxlint static-code helper.
- Build development and production bundles and verify translation and package
  generation.
- Run the Machines VM/browser checks, including VM creation, lifecycle,
  storage, network, and console workflows.
- Confirm React loads without runtime exceptions or the outdated JSX transform
  warning, and confirm Oxlint is absent from runtime output.
