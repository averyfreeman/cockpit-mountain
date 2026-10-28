import React, { Fragment, ReactNode, useMemo, useState } from 'react';

import {
    Button,
    Icon,
    Label,
    SearchInput,
    Text,
    TextContent,
    TextVariants,
    Toolbar,
    ToolbarContent,
    ToolbarItem,
} from '@patternfly/react-core';
import {
    Caption,
    ExpandableRowContent,
    ISortBy,
    OnSort,
    SortByDirection,
    Table,
    Tbody,
    Td,
    Th,
    Thead,
    Tr,
} from '@patternfly/react-table';
import CheckCircleIcon from '@patternfly/react-icons/dist/esm/icons/check-circle-icon';
import CopyIcon from '@patternfly/react-icons/dist/esm/icons/copy-icon';
import ExclamationCircleIcon from '@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon';

import { TailscalePeer } from '../types';
import {
    formatBytes,
    isUsablePeer,
    keyExpiryDays,
    peerSubnetRoutes,
} from '../services/tailscale';

interface PeersTableProps {
    self: TailscalePeer;
    peers: Record<string, TailscalePeer> | null;
    /** RunSSH preference of this node (only known for Self) */
    selfSshEnabled: boolean;
    /** browser-local preference controlling the Subnet badge */
    showSubnets: boolean;
}

export function PeersTable({ self, peers, selfSshEnabled, showSubnets }: PeersTableProps): React.JSX.Element {
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState<ISortBy>({ index: 1, direction: SortByDirection.asc });

    const rows = useMemo(() => {
        const all = [self, ...Object.values(peers ?? {}).filter(isUsablePeer)];
        const needle = search.trim().toLowerCase();
        const filtered = needle === ''
            ? all
            : all.filter(p =>
                p.HostName.toLowerCase().includes(needle) ||
                p.DNSName.toLowerCase().includes(needle) ||
                p.TailscaleIPs.some(ip => ip.includes(needle)));

        const sorted = [...filtered];
        const dir = sortBy.direction === SortByDirection.asc ? 1 : -1;
        if (sortBy.index === 1)
            sorted.sort((a, b) => dir * machineOf(a).localeCompare(machineOf(b)));
        else if (sortBy.index === 4)
            sorted.sort((a, b) => dir * (lastSeenMs(a) - lastSeenMs(b)));
        return sorted;
    }, [self, peers, search, sortBy]);

    const onSort: OnSort = (_event, index, direction) => setSortBy({ index, direction });

    return (
        <>
            <PeersSearch value={search} onChange={setSearch} />
            <Table aria-label="Tailscale peers" variant="compact" borders={false}>
                <Caption>Tailscale peers</Caption>
                <Thead>
                    <Tr>
                        <Th screenReaderText="Peer details" />
                        <Th sort={{ sortBy, onSort, columnIndex: 1 }}>Machine</Th>
                        <Th>Addresses</Th>
                        <Th>Operating system</Th>
                        <Th sort={{ sortBy, onSort, columnIndex: 4 }}>Last seen</Th>
                        <Th>Features</Th>
                    </Tr>
                </Thead>
                {rows.map((peer, idx) => (
                    <PeerRow
                        key={peer.ID}
                        peer={peer}
                        rowIndex={idx}
                        selfSshEnabled={selfSshEnabled}
                        showSubnets={showSubnets} />
                ))}
                {rows.length === 0 && (
                    <Tbody>
                        <Tr>
                            <Td colSpan={6}>
                                <TextContent>
                                    <Text component={TextVariants.p}>No peers match the current filter.</Text>
                                </TextContent>
                            </Td>
                        </Tr>
                    </Tbody>
                )}
            </Table>
        </>
    );
}

function machineOf(peer: TailscalePeer): string {
    return peer.DNSName !== '' ? peer.DNSName.split('.')[0] : peer.HostName;
}

function lastSeenMs(peer: TailscalePeer): number {
    const t = new Date(peer.LastSeen).getTime();
    return Number.isNaN(t) ? 0 : t;
}

function PeerRow({ peer, rowIndex, selfSshEnabled, showSubnets }: {
    peer: TailscalePeer;
    rowIndex: number;
    selfSshEnabled: boolean;
    showSubnets: boolean;
}): React.JSX.Element {
    const [expanded, setExpanded] = useState(false);
    const routes = peerSubnetRoutes(peer);
    const { ipv4, ipv6 } = splitAddresses(peer);

    return (
        <Tbody isExpanded={expanded}>
            <Tr>
                <Td
                    expand={{
                        rowIndex,
                        isExpanded: expanded,
                        expandId: 'peer-expand',
                        onToggle: () => setExpanded(e => !e),
                    }} />
                <Td>
                    <Icon status={peer.Online ? 'success' : 'danger'}>
                        {peer.Online
                            ? <CheckCircleIcon />
                            : <ExclamationCircleIcon />}
                    </Icon>
                    {' '}
                    {machineOf(peer)}
                    {peer.Self && (
                        <>
                            {' '}
                            <Label isCompact color="blue">Self</Label>
                        </>
                    )}
                </Td>
                <Td>
                    <CopyButton text={ipv4 ?? ''} />
                    {' '}
                    {ipv4 ?? '-'}
                    {ipv6 && (
                        <>
                            <br />
                            {ipv6}
                        </>
                    )}
                </Td>
                <Td>{peer.OS}</Td>
                <Td>{!peer.Online ? new Date(peer.LastSeen).toLocaleString() : ''}</Td>
                <Td>{featureBadges(peer, selfSshEnabled, showSubnets)}</Td>
            </Tr>
            <Tr isExpanded={expanded}>
                <Td />
                <Td colSpan={5}>
                    <ExpandableRowContent>
                        <dl className="pf-v5-c-description-list pf-v5-u-m-sm">
                            <div>FQDN: {peer.DNSName || '-'}</div>
                            <div>Connection: {connectionState(peer)}</div>
                            <div>Last handshake: {new Date(peer.LastHandshake).toLocaleString()}</div>
                            <div>Created: {new Date(peer.Created).toLocaleString()}</div>
                            <div>
                                Transferred: {formatBytes(peer.TxBytes)} sent /{' '}
                                {formatBytes(peer.RxBytes)} received
                            </div>
                            <div>Advertised routes: {routes.length > 0 ? routes.join(', ') : 'none'}</div>
                        </dl>
                    </ExpandableRowContent>
                </Td>
            </Tr>
        </Tbody>
    );
}

/**
 * Compact capability indicators for a peer. Badges only appear when
 * the corresponding feature is present; an empty cell renders as '-'.
 */
function featureBadges(peer: TailscalePeer, selfSshEnabled: boolean, showSubnets: boolean): ReactNode {
    const badges: ReactNode[] = [];

    if (peer.Self && selfSshEnabled)
        badges.push(<Label key="ssh" color="green" isCompact>SSH</Label>);

    if (peer.ExitNodeOption || peer.ExitNode)
        badges.push(<Label key="exit-node" color="cyan" isCompact>Exit node</Label>);

    const routes = peerSubnetRoutes(peer);
    if (showSubnets && routes.length > 0)
        badges.push(<Label key="subnets" color="gold" isCompact>Subnet</Label>);

    /* Key expiry: indicator when disabled, days remaining otherwise */
    if (!peer.KeyExpiry) {
        badges.push(<Label key="expiry-disabled" color="grey" isCompact>Expiry disabled</Label>);
    } else {
        const days = keyExpiryDays(peer.KeyExpiry);
        if (days !== null) {
            if (days < 0)
                badges.push(<Label key="expiry" color="red" isCompact>Expired</Label>);
            else
                badges.push(
                    <Label
                        key="expiry"
                        color={days <= 30 ? 'orange' : 'blue'}
                        isCompact>
                        Expires in {days}d
                    </Label>);
        }
    }

    if (badges.length === 0)
        return '-';

    return badges.map((badge, i) => (
        <Fragment key={`badge-${i}`}>
            {i > 0 && ' '}
            {badge}
        </Fragment>
    ));
}

function splitAddresses(peer: TailscalePeer): { ipv4?: string; ipv6?: string } {
    const ips = peer.TailscaleIPs ?? [];
    return {
        ipv4: ips.find(ip => !ip.includes(':')),
        ipv6: ips.find(ip => ip.includes(':')),
    };
}

function connectionState(peer: TailscalePeer): string {
    if (peer.Self)
        return 'Self';
    if (!peer.Online)
        return 'Offline';
    if (!peer.Active)
        return 'Idle';
    return peer.CurAddr !== ''
        ? `Direct (${peer.CurAddr})`
        : `Relay (${peer.Relay})`;
}

function CopyButton({ text }: { text: string }): React.JSX.Element | null {
    if (text === '')
        return null;
    return (
        <Button
            variant="plain"
            aria-label={`Copy ${text}`}
            title="Copy IPv4 address"
            onClick={() => void navigator.clipboard?.writeText(text).catch(() => undefined)}>
            <CopyIcon />
        </Button>
    );
}

/* Toolbar kept as a named export for future layout use */
export function PeersSearch({ value, onChange }: { value: string; onChange: (v: string) => void }): React.JSX.Element {
    return (
        <Toolbar id="peers-toolbar">
            <ToolbarContent>
                <ToolbarItem variant="search-filter" widths={{ default: '300px' }}>
                    <SearchInput
                        aria-label="Filter peers"
                        placeholder="Filter by hostname or IP"
                        value={value}
                        onChange={(_e, v) => onChange(v)}
                        onClear={() => onChange('')} />
                </ToolbarItem>
            </ToolbarContent>
        </Toolbar>
    );
}
