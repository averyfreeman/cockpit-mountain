// SPDX-License-Identifier: LGPL-2.1-or-later
import cockpit from "cockpit";
import { Component, type ReactNode } from "react";
import { createRoot as createReactRoot, type Container, type Root, type RootOptions } from "react-dom/client";

export type { Container, Root, RootOptions } from "react-dom/client";

const _ = cockpit.gettext;

class PageErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
    state = { failed: false };

    static getDerivedStateFromError() {
        return { failed: true };
    }

    render() {
        if (this.state.failed) {
            return (
                <section role="alert" style={{ padding: "2rem" }}>
                    <h1>{_("The page failed to load.")}</h1>
                    <p>{_("Reload the page to try again.")}</p>
                    <button type="button" className="pf-v6-c-button pf-m-primary"
                            onClick={() => window.location.reload()}>
                        {_("Reload")}
                    </button>
                </section>
            );
        }
        return this.props.children;
    }
}

/** Create an application root with a recoverable screen for render failures.
 * React's default error reporting still records the error and component stack.
 * Keep the native Root interface for pages that render repeatedly or unmount.
 */
export function createRoot(container: Container, options?: RootOptions): Root {
    const root = createReactRoot(container, options);
    return {
        render(children) {
            root.render(<PageErrorBoundary>{children}</PageErrorBoundary>);
        },
        unmount() {
            root.unmount();
        }
    };
}
