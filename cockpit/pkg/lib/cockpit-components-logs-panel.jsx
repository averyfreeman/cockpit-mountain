/*
 * Copyright (C) 2017 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import cockpit from "cockpit";
import { useEffect, useState } from "react";
import { useDeepEqualMemo } from "hooks";

import { Badge } from "@patternfly/react-core/dist/esm/components/Badge/index.js";
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core/dist/esm/components/Card/index.js';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';

import { journal } from "journal";
import "journal.css";
import "cockpit-components-logs-panel.scss";

const _ = cockpit.gettext;

/* JournalOutput implements the interface expected by
   journal.renderer, and also collects the output.
 */

export class JournalOutput {
    constructor(search_options) {
        this.logs = [];
        this.reboot_key = 0;
        this.search_options = search_options || {};
    }

    onEvent(ev, cursor, full_content) {
        // only consider primary mouse button for clicks
        if (ev.type === 'click') {
            if (ev.button !== 0)
                return;

            // Ignore if text is being selected - less than 3 characters most likely means misclick
            const selection = window.getSelection()?.toString();
            if (selection && selection.length > 2 && full_content.indexOf(selection) >= 0)
                return;
        }

        // only consider enter button for keyboard events
        if (ev.type === 'keydown' && ev.key !== "Enter")
            return;

        cockpit.jump("system/logs#/" + cursor + "?parent_options=" + JSON.stringify(this.search_options));
    }

    render_line(ident, prio, message, count, time, entry) {
        let warning = false;

        if (prio < 4) {
            warning = true;
        }

        const full_content = [time, message, ident].join("\n");

        return (
            <div className="cockpit-logline" role="row" tabIndex={0} key={entry.__CURSOR}
                data-cursor={entry.__CURSOR}
                onClick={ev => this.onEvent(ev, entry.__CURSOR, full_content)}
                onKeyDown={ev => this.onEvent(ev, entry.__CURSOR, full_content)}>
                <div className="cockpit-log-warning" role="cell">
                    { warning
                        ? <ExclamationTriangleIcon className="ct-icon-exclamation-triangle" />
                        : null
                    }
                </div>
                <div className="cockpit-log-time" role="cell">{time}</div>
                <span className="cockpit-log-message" role="cell">{message}</span>
                {
                    count > 1
                        ? <div className="cockpit-log-service-container" role="cell">
                            <div className="cockpit-log-service-reduced">{ident}</div>
                            <Badge screenReaderText={_("Occurrences")} isRead key={count}>{count}</Badge>
                        </div>
                        : <div className="cockpit-log-service" role="cell">{ident}</div>
                }
            </div>
        );
    }

    render_day_header(day) {
        return <div className="panel-heading" key={day}>{day}</div>;
    }

    render_reboot_separator() {
        return (
            <div className="cockpit-logline" role="row" key={"reboot-" + this.reboot_key++}>
                <div className="cockpit-log-warning" role="cell" />
                <span className="cockpit-log-message cockpit-logmsg-reboot" role="cell">{_("Reboot")}</span>
            </div>
        );
    }

    prepend(item) {
        this.logs.unshift(item);
    }

    append(item) {
        this.logs.push(item);
    }

    remove_first() {
        this.logs.shift();
    }

    remove_last() {
        this.logs.pop();
    }

    limit(max) {
        if (this.logs.length > max)
            this.logs = this.logs.slice(0, max);
    }
}

/**
 * @param {{ match: string[], max: number, title: import('react').ReactNode,
 *           search_options?: Record<string, string>, goto_url?: string,
 *           emptyMessage?: string | import('react').ReactNode[], className?: string }} props
 */
export function LogsPanel({ match, max, search_options, goto_url, title, emptyMessage = "" }) {
    const [logs, setLogs] = useState(/** @type {import('react').ReactNode[]} */ ([]));
    const stableMatch = useDeepEqualMemo(match);
    const searchOptions = useDeepEqualMemo(search_options);

    useEffect(() => {
        let active = true;
        setLogs([]);
        const journalctl = journal.journalctl(stableMatch, { count: max });
        const output = new JournalOutput(searchOptions);
        const renderer = journal.renderer(output);

        journalctl.stream(entries => {
            if (!active)
                return;
            for (const entry of entries)
                renderer.prepend(entry);
            renderer.prepend_flush();
            // Keep the date header in addition to the requested number of entries.
            output.limit(max + 1);
            setLogs([...output.logs]);
        });

        return () => {
            active = false;
            journalctl.stop();
        };
    }, [stableMatch, max, searchOptions]);

    const actions = logs.length > 0 && goto_url
        ? <Button variant="secondary" onClick={() => cockpit.jump(goto_url)}>{_("View all logs")}</Button>
        : null;

    return (
        <Card isPlain className="cockpit-log-panel">
            <CardHeader actions={{ actions }}>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardBody className={(!logs.length && emptyMessage.length) ? "empty-message" : "contains-list"}>
                {logs.length ? logs : emptyMessage}
            </CardBody>
        </Card>
    );
}
