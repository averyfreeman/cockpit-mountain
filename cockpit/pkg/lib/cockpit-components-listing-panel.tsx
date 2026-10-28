/*
 * Copyright (C) 2020 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import React, { useState } from 'react';
import { Tab, TabTitleText, Tabs } from "@patternfly/react-core/dist/esm/components/Tabs/index.js";
import './cockpit-components-listing-panel.scss';

/* tabRenderers optional: list of tab renderers for inline expansion, array of objects with
 *     - name tab name (has to be unique in the entry, used as react key)
 *     - renderer react component
 *     - data render data passed to the tab renderer
 */

interface TabRenderer {
    name: string;
    // oxlint-disable-next-line typescript/no-explicit-any
    renderer: React.ComponentType<any>;
    data?: Record<string, unknown>;
}

interface ListingPanelProps {
    tabRenderers?: TabRenderer[];
    listingDetail?: React.ReactNode;
    initiallyActiveTab?: number;
}

export function ListingPanel({ tabRenderers = [], listingDetail, initiallyActiveTab = 0 }: ListingPanelProps) {
    const [activeTab, setActiveTab] = useState<string | number>(initiallyActiveTab);

    return (
        <div className="ct-listing-panel">
            {listingDetail !== undefined && <div className="ct-listing-panel-actions pf-v6-c-tabs">
                <span className="ct-listing-panel-caption">{listingDetail}</span>
            </div>}
            {tabRenderers.length > 0 && <Tabs activeKey={activeTab} className="ct-listing-panel-tabs" mountOnEnter
                                            onSelect={(event, tabIndex) => {
                                                event.preventDefault();
                                                setActiveTab(tabIndex);
                                            }}>
                {tabRenderers.map((item, tabIndex) => {
                    const Renderer = item.renderer;
                    return (
                        <Tab key={item.name} eventKey={tabIndex} title={<TabTitleText>{item.name}</TabTitleText>}>
                            <div className="ct-listing-panel-body" data-key={tabIndex}>
                                <Renderer {...item.data} />
                            </div>
                        </Tab>
                    );
                })}
            </Tabs>}
        </div>
    );
}
