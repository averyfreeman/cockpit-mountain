/*
 * Copyright (C) 2020 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Breadcrumb, BreadcrumbItem } from "@patternfly/react-core/dist/esm/components/Breadcrumb/index.js";
import { PageBreadcrumb, PageSection } from "@patternfly/react-core/dist/esm/components/Page/index.js";
import { Stack } from "@patternfly/react-core/dist/esm/layouts/Stack/index.js";
import { ExclamationCircleIcon } from '@patternfly/react-icons';

import { EmptyStatePanel } from "cockpit-components-empty-state.jsx";
import { ServiceDetails } from "./service-details.jsx";
import { LogsPanel } from "cockpit-components-logs-panel.jsx";
import { superuser } from 'superuser';
import { WithDialogs } from "dialogs.jsx";

import cockpit from "cockpit";

import s_bus from "./busnames.js";

const _ = cockpit.gettext;

function debug() {
    if (window.debugging === "all" || window.debugging?.includes("service-details")) // not-covered: debugging
        console.debug.apply(console, arguments); // not-covered: debugging
}

export const Service = ({ dbusClient, owner, unitId, unitIsValid, addTimerProperties, pinnedUnits }) => {
    const _path = useRef(null);
    const [error, setError] = useState(null);
    const [reloading, setReloading] = useState(false);
    const [loadedUnit, setLoadedUnit] = useState(null);
    const unitProps = loadedUnit?.id === unitId ? loadedUnit.props : null;

    const updateProperties = useCallback(() => {
        const path = _path.current?.path;
        if (!path || _path.current?.unitId !== unitId)
            return;
        const promises = [dbusClient.call(path, s_bus.I_PROPS, "GetAll", [s_bus.I_UNIT])];

        if (unitId.endsWith(".timer"))
            promises.push(dbusClient.call(path, s_bus.I_PROPS, "GetAll", [s_bus.I_TIMER]));
        else if (unitId.endsWith(".socket"))
            promises.push(dbusClient.call(path, s_bus.I_PROPS, "GetAll", [s_bus.I_SOCKET]));

        Promise.all(promises)
                .then(replies => {
                    if (_path.current?.path !== path || _path.current?.unitId !== unitId)
                        return;
                    const unit_props = replies[0][0];

                    // unwrap variants
                    for (const key in unit_props)
                        unit_props[key] = unit_props[key].v;

                    if (unitId.endsWith(".timer"))
                        addTimerProperties(replies[1][0], unit_props);
                    else if (unitId.endsWith(".socket"))
                        unit_props.Listen = replies[1][0].Listen.v;

                    unit_props.path = path;

                    debug("Service detail", unitId, "updated properties:", JSON.stringify(unit_props));
                    setLoadedUnit({ id: unitId, props: unit_props });
                    setError(null);
                })
                .catch(ex => {
                    if (_path.current?.path === path && _path.current?.unitId === unitId)
                        setError(ex.toString());
                }); // not-covered: unexpected OS error
    }, [dbusClient, unitId, addTimerProperties]);

    // Each committed unit owns its subscription. Late replies from a previous
    // unit must not replace the data or actions for the current one.
    useEffect(() => {
        let active = true;
        let subscription;
        setError(null);
        dbusClient.call(s_bus.O_MANAGER, s_bus.I_MANAGER, "LoadUnit", [unitId])
                .then(([path]) => {
                    if (!active)
                        return;
                    subscription = dbusClient.subscribe(
                        { path, interface: s_bus.I_PROPS, member: "PropertiesChanged" }, updateProperties);
                    _path.current = { unitId, path };
                    updateProperties();
                })
                .catch(ex => {
                    if (active)
                        setError(ex.toString());
                });
        return () => {
            active = false;
            subscription?.remove();
            _path.current = null;
        };
    }, [dbusClient, unitId, updateProperties]);

    useEffect(() => {
        const subscription = dbusClient.subscribe(
            { interface: s_bus.I_MANAGER, member: "Reloading" },
            (_, _i, _s, [is_reloading]) => {
                setReloading(is_reloading);
                if (!is_reloading)
                    updateProperties();
            });
        return () => subscription.remove();
    }, [dbusClient, updateProperties]);

    // Failed Conditions may only be available when a completed job is removed.
    useEffect(() => {
        const subscription = dbusClient.subscribe(
            { interface: s_bus.I_MANAGER, member: "JobRemoved" },
            (_p, _i, _s, [_job_id, _job_path, unit, result]) => {
                if (result === "done" && unit === unitId)
                    updateProperties();
            });
        return () => subscription.remove();
    }, [dbusClient, unitId, updateProperties]);

    // render
    if (error)
        return <EmptyStatePanel title={_("Loading unit failed")} icon={ExclamationCircleIcon} paragraph={error} />; // not-covered: unexpected OS error

    if (unitProps === null)
        return <EmptyStatePanel loading title={_("Loading...")} paragraph={unitId} />;

    // resolve Alias name to primary ID
    const cur_unit_id = unitProps.Id;

    const unit_type = owner === "system" ? "UNIT" : "USER_UNIT";
    const match = [
        "_SYSTEMD_" + unit_type + "=" + cur_unit_id, "+",
        "COREDUMP_" + unit_type + "=" + cur_unit_id, "+",
        unit_type + "=" + cur_unit_id,
    ];
    const service_type = owner === "system" ? "service" : "user-service";
    const url = "/system/logs/#/?prio=debug&" + service_type + "=" + cur_unit_id;
    const load_state = unitProps.LoadState;

    return (
        <WithDialogs>
            <PageBreadcrumb hasBodyWrapper={false} stickyOnBreakpoint={{ default: "top" }}>
                <Breadcrumb>
                    <BreadcrumbItem to={"#" + cockpit.location.href.replace(/\/[^?]*/, '')}>{_("Services")}</BreadcrumbItem>
                    <BreadcrumbItem isActive>
                        {cur_unit_id}
                    </BreadcrumbItem>
                </Breadcrumb>
            </PageBreadcrumb>
            <PageSection hasBodyWrapper={false} id="service-details">
                <Stack hasGutter>
                    <ServiceDetails unit={unitProps}
                                    owner={owner}
                                    permitted={superuser.allowed}
                                    loadingUnits={reloading}
                                    isValid={unitIsValid}
                                    pinnedUnits={pinnedUnits} />
                    {(load_state === "loaded" || load_state === "masked") &&
                    <LogsPanel title={_("Service logs")} match={match} emptyMessage={_("No log entries")} max={10} goto_url={url} search_options={{ prio: "debug", [service_type]: cur_unit_id }} />}
                </Stack>
            </PageSection>
        </WithDialogs>
    );
};
