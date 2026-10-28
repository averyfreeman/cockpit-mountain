/*
 * Copyright (C) 2021 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import cockpit from "cockpit";
import React, { useEffect, useState } from "react";
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { Dropdown, DropdownGroup, DropdownItem, DropdownList } from '@patternfly/react-core/dist/esm/components/Dropdown/index.js';
import { MenuToggle } from "@patternfly/react-core/dist/esm/components/MenuToggle";
import { Divider } from "@patternfly/react-core/dist/esm/components/Divider";
import { Masthead, MastheadContent } from "@patternfly/react-core/dist/esm/components/Masthead/index.js";
import { Spinner } from "@patternfly/react-core/dist/esm/components/Spinner/index.js";
import { ToggleGroup, ToggleGroupItem } from "@patternfly/react-core/dist/esm/components/ToggleGroup/index.js";
import { Toolbar, ToolbarContent, ToolbarItem } from "@patternfly/react-core/dist/esm/components/Toolbar/index.js";
import { CogIcon, ExternalLinkAltIcon, HelpIcon } from '@patternfly/react-icons';
import { Icon } from "@patternfly/react-core/dist/esm/components/Icon/index.js";

import { ShellState } from "./state";
import { ManifestDocs, ManifestParentSection } from "./manifests";
import { ActivePagesDialog } from "./active-pages-modal.jsx";
import { CredentialsModal } from './credentials.jsx';
import { AboutCockpitModal, LangModal, OopsModal } from "./shell-modals.jsx";
import { superuser_proxy, SuperuserProxy, SuperuserIndicator } from "superuser-dialogs";
import { read_os_release } from "os-release.js";
import { useDialogs } from "dialogs.jsx";
import { useEvent } from "hooks";

const _ = cockpit.gettext;

interface TopNavProps {
    state: ShellState;
}

export const TopNav = ({ state }: TopNavProps) => {
    const Dialogs = useDialogs();
    const [docsOpened, setDocsOpened] = useState(false);
    const [menuOpened, setMenuOpened] = useState(false);
    const [showActivePages, setShowActivePages] = useState(false);
    const [osRelease, setOsRelease] = useState<cockpit.JsonObject>({});
    const [theme, setTheme] = useState(() => localStorage.getItem('shell:style') || 'auto');
    const [superuserConnection, setSuperuserConnection] = useState<{ host: string; proxy: SuperuserProxy } | null>(null);
    const { current_machine, current_manifest_item, current_manifest, current_frame } = state;
    cockpit.assert(current_machine && current_manifest && current_manifest_item);
    const connected = current_machine.state === "connected";
    const connectionString = current_machine.connection_string;
    const superuser = connected && superuserConnection?.host === connectionString ? superuserConnection.proxy : null;
    useEvent(superuser, "changed");

    useEffect(() => {
        let active = true;
        read_os_release().then(os => {
            if (active)
                setOsRelease(os || {});
        }).catch(error => console.warn("Could not read OS release:", error));
        return () => { active = false };
    }, []);

    useEffect(() => {
        // Clicking inside a frame blurs the shell window without bubbling a click.
        const closeMenus = () => {
            setMenuOpened(false);
            setDocsOpened(false);
        };
        window.addEventListener("blur", closeMenus);
        return () => window.removeEventListener("blur", closeMenus);
    }, []);

    useEffect(() => {
        if (!connected) {
            setSuperuserConnection(null);
            return;
        }
        const connection = cockpit.dbus(null, { bus: "internal", host: connectionString });
        setSuperuserConnection({ host: connectionString, proxy: superuser_proxy(connection) });
        return () => connection.close();
    }, [connected, connectionString]);

    function handleModeClick(theme: string) {
        setTheme(theme);
        window.dispatchEvent(new CustomEvent("cockpit-style", { detail: { style: theme } }));
        localStorage.setItem("shell:style", theme);
        state.update();
    }

    let docs: ManifestDocs[] = [];

    // Check first whether we have docs in the "parent" section of
    // the manifest.
    const parent = (current_manifest.parent || {}) as ManifestParentSection;
    if (parent.docs)
        docs = parent.docs;
    else if (current_manifest_item.docs)
        docs = current_manifest_item.docs;

    const docItems = [];

    if (typeof osRelease?.DOCUMENTATION_URL === "string")
        docItems.push(<DropdownItem key="os-doc" to={osRelease.DOCUMENTATION_URL} target="blank" rel="noopener noreferrer" icon={<ExternalLinkAltIcon />}>
            {cockpit.format(_("$0 documentation"), osRelease.NAME)}
        </DropdownItem>);

    const shell_manifest = state.config.manifest;

    // global documentation for cockpit as a whole
    (shell_manifest.docs ?? []).forEach(doc => {
        docItems.push(<DropdownItem key={doc.label} to={doc.url} target="blank" rel="noopener noreferrer" icon={<ExternalLinkAltIcon />}>
            {doc.label}
        </DropdownItem>);
    });

    if (docs.length > 0)
        docItems.push(<Divider key="separator" />);

    docs.forEach(e => {
        docItems.push(<DropdownItem key={e.label} to={e.url} target="blank" rel="noopener noreferrer" icon={<ExternalLinkAltIcon />}>
            {_(e.label)}
        </DropdownItem>);
    });

    docItems.push(<Divider key="separator1" />);
    docItems.push(<DropdownItem key="about" component="button"
                                onClick={() => Dialogs.run(AboutCockpitModal, {})}>
        {_("About Web Console")}
    </DropdownItem>);

    // HACK: This should be a DropdownItem so the normal onSelect closing behaviour works, but we can't embed a button in a button
    const main_menu = [
        <li // oxlint-disable-line jsx-a11y/no-noninteractive-element-interactions,jsx-a11y/click-events-have-key-events
            id="super-user-indicator-mobile"
            className="pf-v6-c-menu__list-item pf-v6-c-menu__item mobile_v"
            key="superusermobile"
            onClick={() => {
                setMenuOpened(false);
            }}>
            <SuperuserIndicator proxy={superuser} host={current_machine.connection_string} />
        </li>,
        <Divider key="separator2" className="mobile_v" />,
        <DropdownGroup label={_("Style")} key="dark-switcher">
            <DropdownList>
                <DropdownItem key="dark-switcher-menu" component="div">
                    <ToggleGroup key="dark-switcher-togglegroup">
                        <ToggleGroupItem key="dark-switcher-auto" buttonId="auto" text={_("Default")}
                            isSelected={theme === "auto"}
                            onChange={() => handleModeClick("auto")} />
                        <ToggleGroupItem key="dark-switcher-light" buttonId="light" text={_("Light")}
                            isSelected={theme === "light"}
                            onChange={() => handleModeClick("light")} />
                        <ToggleGroupItem key="dark-switcher-dark" buttonId="dark" text={_("Dark")}
                            isSelected={theme === "dark"}
                            onChange={() => handleModeClick("dark")} />
                    </ToggleGroup>
                </DropdownItem>
            </DropdownList>
        </DropdownGroup>,
        <Divider key="separatorDark" />,
    ];

    if (shell_manifest.locales)
        main_menu.push(<DropdownItem key="languages" className="display-language-menu"
                                     onClick={() => Dialogs.run(LangModal, { state })}>
            {_("Display language")}
        </DropdownItem>);

    if (showActivePages)
        main_menu.push(
            <DropdownItem key="frames" id="active-pages" component="button"
                          onClick={() => Dialogs.run(ActivePagesDialog, { state })}>
                {_("Active pages")}
            </DropdownItem>);

    main_menu.push(
        <DropdownItem key="creds" id="sshkeys" component="button"
                      onClick={() => Dialogs.run(CredentialsModal, {})}>
            {_("SSH keys")}
        </DropdownItem>,
        <Divider key="separator3" />,
        <DropdownItem key="logout" id="logout" component="button" onClick={cockpit.logout}>
            {_("Log out")}
        </DropdownItem>,
    );

    return (
        <Masthead>
            <MastheadContent>
                <Toolbar id="toolbar" isFullHeight isStatic>
                    <ToolbarContent className="ct-topnav-content">
                        { (current_frame && !current_frame.ready) &&
                            <ToolbarItem id="machine-spinner">
                                <Spinner size="lg" style={{ "--pf-v6-c-spinner--diameter": "2rem" } as React.CSSProperties } />
                            </ToolbarItem>
                        }
                        { connected &&
                            <ToolbarItem id="super-user-indicator" className="super-user-indicator desktop_v">
                                <SuperuserIndicator proxy={superuser} host={current_machine.connection_string} />
                            </ToolbarItem>
                        }
                        { state.has_oops &&
                            <ToolbarItem>
                                <Button id="navbar-oops" variant="link" size="lg" isDanger
                                        onClick={() => Dialogs.run(OopsModal, {})}>{_("Ooops!")}</Button>
                            </ToolbarItem>
                        }
                        <ToolbarItem>
                            <Dropdown
                                id="toggle-docs-menu"
                                onSelect={() => {
                                    setDocsOpened(false);
                                    document.getElementById("toggle-docs")?.focus();
                                }}
                                toggle={(toggleRef) => (
                                    <MenuToggle
                                      ref={toggleRef}
                                      id="toggle-docs"
                                      variant="plain"
                                      className="ct-nav-toggle"
                                      icon={<Icon size="lg"><HelpIcon className="toggle-docs-icon" /></Icon>}
                                      isExpanded={docsOpened}
                                      isFullHeight
                                      onClick={() => {
                                          setDocsOpened(open => !open);
                                          setMenuOpened(false);
                                      }}>
                                        {_("Help")}
                                    </MenuToggle>
                                )}
                                isOpen={docsOpened}
                                popperProps={{ position: "right" }}
                            >
                                <DropdownList>
                                    {docItems}
                                </DropdownList>
                            </Dropdown>
                        </ToolbarItem>
                        <ToolbarItem>
                            <Dropdown
                                id="toggle-menu-menu"
                                onSelect={() => {
                                    setMenuOpened(false);
                                    document.getElementById("toggle-menu")?.focus();
                                }}
                                toggle={(toggleRef) => (
                                    <MenuToggle
                                      ref={toggleRef}
                                      id="toggle-menu"
                                      variant="plain"
                                      className="ct-nav-toggle"
                                      icon={<Icon size="lg"><CogIcon /></Icon>}
                                      isExpanded={menuOpened}
                                      isFullHeight
                                      onClick={(event) => {
                                          setMenuOpened(open => !open);
                                          setDocsOpened(false);
                                          setShowActivePages(event.altKey);
                                      }}
                                    >
                                        {_("Session")}
                                    </MenuToggle>
                                )}
                                isOpen={menuOpened}
                                popperProps={{ position: "right" }}
                            >
                                <DropdownList>
                                    {main_menu}
                                </DropdownList>
                            </Dropdown>
                        </ToolbarItem>
                    </ToolbarContent>
                </Toolbar>
            </MastheadContent>
        </Masthead>
    );
};
