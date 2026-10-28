import React from 'react';

import {
    Alert,
    Button,
    DescriptionList,
    DescriptionListDescription,
    DescriptionListGroup,
    DescriptionListTerm,
    Label,
    LabelProps,
    Split,
    SplitItem,
} from '@patternfly/react-core';

import { ClientPrefs, TailscaleBackendState, TailscaleStatus } from '../types';
import {
    connect as tsConnect,
    disconnect as tsDisconnect,
    splitTailscaleIps,
} from '../services/tailscale';
import { useOperation } from '../hooks/useOperation';

const STATE_COLORS: Record<TailscaleBackendState, LabelProps['color']> = {
    NoState: 'grey',
    NeedsMachineAuth: 'orange',
    NeedsLogin: 'orange',
    InUseOtherUser: 'orange',
    Stopped: 'red',
    Starting: 'blue',
    Running: 'green',
};

interface StatusPanelProps {
    status: TailscaleStatus;
    prefs: ClientPrefs;
    /** true when mutations are permitted (superuser + supported client) */
    canOperate: boolean;
    onRefresh: () => Promise<void>;
}

export function StatusPanel({ status, prefs, canOperate, onRefresh }: StatusPanelProps): React.JSX.Element {
    const op = useOperation();
    const running = status.BackendState === 'Running';
    const stopped = status.BackendState === 'NoState' || status.BackendState === 'Stopped';
    const self = status.Self;
    const { ipv4, ipv6 } = splitTailscaleIps(self?.TailscaleIPs);

    const doToggle = () => op.run(async () => {
        if (running)
            await tsDisconnect();
        else
            await tsConnect();
        await onRefresh();
    });

    return (
        <>
            {op.error && (
                <Alert variant="danger" isInline title="Operation failed">
                    {op.error}
                </Alert>
            )}

            {status.BackendState === 'NeedsLogin' && status.AuthURL && (
                <Alert
                    variant="warning"
                    isInline
                    title="Login required"
                    actionLinks={
                        <Button
                            component="a"
                            href={status.AuthURL}
                            target="_blank"
                            rel="noopener noreferrer"
                            variant="primary">
                            Log in
                        </Button>
                    }>
                    Open the login page to authenticate this machine with your Tailscale account.
                </Alert>
            )}

            {status.BackendState === 'NeedsMachineAuth' && (
                <Alert variant="warning" isInline title="Machine approval required">
                    An administrator has to approve this machine in the Tailscale admin console.
                </Alert>
            )}

            {status.BackendState === 'InUseOtherUser' && (
                <Alert variant="warning" isInline title="Another user is connected">
                    Another local user is currently using Tailscale on this machine.
                </Alert>
            )}

            <Split hasGutter>
                <SplitItem isFilled>
                    <DescriptionList
                        isHorizontal
                        isCompact
                        aria-label="Tailscale connection status">
                        <DescriptionListGroup>
                            <DescriptionListTerm>State</DescriptionListTerm>
                            <DescriptionListDescription>
                                <Label color={STATE_COLORS[status.BackendState]}>
                                    {status.BackendState}
                                </Label>
                            </DescriptionListDescription>
                        </DescriptionListGroup>

                        <DescriptionListGroup>
                            <DescriptionListTerm>IPv4</DescriptionListTerm>
                            <DescriptionListDescription>{ipv4 ?? '-'}</DescriptionListDescription>
                        </DescriptionListGroup>

                        <DescriptionListGroup>
                            <DescriptionListTerm>IPv6</DescriptionListTerm>
                            <DescriptionListDescription>{ipv6 ?? '-'}</DescriptionListDescription>
                        </DescriptionListGroup>

                        <DescriptionListGroup>
                            <DescriptionListTerm>DNS</DescriptionListTerm>
                            <DescriptionListDescription>
                                {prefs.acceptDns
                                    ? `Accepted · ${status.CurrentTailnet?.MagicDNSSuffix ?? 'unknown'}`
                                    : 'Not accepted'}
                            </DescriptionListDescription>
                        </DescriptionListGroup>

                        <DescriptionListGroup>
                            <DescriptionListTerm>Tailnet</DescriptionListTerm>
                            <DescriptionListDescription>
                                {status.CurrentTailnet?.Name ?? '-'}
                            </DescriptionListDescription>
                        </DescriptionListGroup>
                    </DescriptionList>
                </SplitItem>
                <SplitItem>
                    <Button
                        variant={running ? 'secondary' : 'primary'}
                        onClick={doToggle}
                        isDisabled={!canOperate || op.pending || (!running && !stopped)}
                        isLoading={op.pending}>
                        {running ? 'Disconnect' : 'Connect'}
                    </Button>
                </SplitItem>
            </Split>

            {!canOperate && (
                <p className="pf-v5-u-disabled-color-100 pf-v5-u-font-size-sm">
                    Administrative privileges are required to change the state or settings.
                </p>
            )}
        </>
    );
}
