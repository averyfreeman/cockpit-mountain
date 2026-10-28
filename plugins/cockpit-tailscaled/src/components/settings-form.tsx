import React, { useMemo, useState } from 'react';

import {
    Alert,
    Button,
    Divider,
    Form,
    FormGroup,
    HelperText,
    HelperTextItem,
    MenuToggle,
    Select,
    SelectList,
    SelectOption,
    Switch,
    TextInput,
} from '@patternfly/react-core';

import { ClientPrefs, ClientSettingsDelta, TailscalePeer } from '../types';
import {
    applySettings,
    exitNodeCandidates,
    isValidHostname,
    parseSubnetRoutes,
} from '../services/tailscale';
import { useOperation } from '../hooks/useOperation';

interface SettingsFormProps {
    prefs: ClientPrefs;
    peers: Record<string, TailscalePeer> | null;
    /** true when mutations are permitted (superuser + supported client) */
    canOperate: boolean;
    onRefresh: () => Promise<void>;
    /** browser-local preference: Subnet badge in the peers table */
    showSubnets: boolean;
    onShowSubnetsChange: (value: boolean) => void;
}

interface SwitchRowProps {
    id: string;
    label: string;
    description?: string;
    checked: boolean;
    disabled: boolean;
    onChange: (checked: boolean) => void;
}

function SwitchRow({ id, label, description, checked, disabled, onChange }: SwitchRowProps): React.JSX.Element {
    return (
        <FormGroup label={label} fieldId={id}>
            <Switch
                id={`${id}-switch`}
                aria-label={label}
                isChecked={checked}
                isDisabled={disabled}
                onChange={(_event, value) => onChange(value)} />
            {description &&
                <HelperText>
                    <HelperTextItem>{description}</HelperTextItem>
                </HelperText>}
        </FormGroup>
    );
}

export function SettingsForm({ prefs, peers, canOperate, onRefresh, showSubnets, onShowSubnetsChange }: SettingsFormProps): React.JSX.Element {
    const op = useOperation();

    /* null = untouched -> display value from prefs */
    const [routesInput, setRoutesInput] = useState<string | null>(null);
    const [hostnameInput, setHostnameInput] = useState<string | null>(null);
    const [exitNodeOpen, setExitNodeOpen] = useState(false);

    const candidates = useMemo(() => exitNodeCandidates(peers ?? {}), [peers]);

    const routesValue = routesInput ?? prefs.advertisedSubnetRoutes.join(', ');
    const hostnameValue = hostnameInput ?? prefs.hostnameOverride;

    const parsedRoutes = parseSubnetRoutes(routesValue);
    const routesValid = parsedRoutes !== null;
    const hostnameValid = hostnameValue === '' || isValidHostname(hostnameValue);

    const dirtyRoutes = routesValid && routesValue !== prefs.advertisedSubnetRoutes.join(', ');
    const dirtyHostname = hostnameValid && hostnameValue !== prefs.hostnameOverride;

    const apply = (delta: ClientSettingsDelta) =>
        op.run(async () => {
            await applySettings(delta);
            await onRefresh();
        });

    const disabled = !canOperate || op.pending;

    return (
        <>
            {!canOperate && (
                <Alert
                    variant="info"
                    isInline
                    title="Administrative privileges required">
                    Settings can only be changed with elevated privileges.
                </Alert>
            )}
            {op.error && (
                <Alert variant="danger" isInline title="Applying settings failed">
                    {op.error}
                </Alert>
            )}

            <Form isHorizontal>

                    <SwitchRow
                        id="ts-ssh"
                        label="Tailscale SSH"
                        description="Run the Tailscale SSH server on this node; access is controlled by the tailnet ACL policy."
                        checked={prefs.sshEnabled}
                        disabled={disabled}
                        onChange={checked => void apply({ sshEnabled: checked })} />

                    <SwitchRow
                        id="ts-accept-dns"
                        label="Accept DNS"
                        description="Apply DNS configuration from the admin panel (MagicDNS resolvers)."
                        checked={prefs.acceptDns}
                        disabled={disabled}
                        onChange={checked => void apply({ acceptDns: checked })} />

                    <SwitchRow
                        id="ts-accept-routes"
                        label="Accept subnet routes"
                        description="Route traffic through subnet routes advertised by other nodes."
                        checked={prefs.acceptRoutes}
                        disabled={disabled}
                        onChange={checked => void apply({ acceptRoutes: checked })} />

                    <SwitchRow
                        id="ts-shields-up"
                        label="Shields up"
                        description="Block incoming connections from other tailnet devices."
                        checked={prefs.shieldsUp}
                        disabled={disabled}
                        onChange={checked => void apply({ shieldsUp: checked })} />

                    <FormGroup label="Exit node" fieldId="ts-exit-node">
                        <Select
                            id="ts-exit-node-select"
                            isOpen={exitNodeOpen}
                            selected={prefs.exitNodeIP}
                            onSelect={(_event, value) => {
                                setExitNodeOpen(false);
                                const ip = String(value || '');
                                void apply({ exitNodeIP: ip === '' ? null : ip });
                            }}
                            onOpenChange={open => setExitNodeOpen(open)}
                            toggle={(toggleRef) => (
                                <MenuToggle
                                    ref={toggleRef}
                                    id="ts-exit-node-toggle"
                                    onClick={() => setExitNodeOpen(!exitNodeOpen)}
                                    isExpanded={exitNodeOpen}
                                    isDisabled={disabled}>
                                    {exitNodeLabel(prefs.exitNodeIP, candidates)}
                                </MenuToggle>
                            )}>
                            <SelectList>
                                <SelectOption value="" description="Do not route traffic through another node">
                                    No exit node
                                </SelectOption>
                                {candidates.map(peer => (
                                    <SelectOption
                                        key={peer.ID}
                                        value={peer.TailscaleIPs[0]}
                                        description={peer.TailscaleIPs[0]}>
                                        {peer.HostName}
                                    </SelectOption>
                                ))}
                            </SelectList>
                        </Select>
                    </FormGroup>

                    {prefs.exitNodeIP !== '' && (
                        <SwitchRow
                            id="ts-exit-lan"
                            label="Allow LAN access while using exit node"
                            description="Keep direct access to the local network when routing via the exit node."
                            checked={prefs.exitNodeAllowLanAccess}
                            disabled={disabled}
                            onChange={checked => void apply({ exitNodeAllowLanAccess: checked })} />
                    )}

                    <SwitchRow
                        id="ts-advertise-exit"
                        label="Advertise as exit node"
                        description="Offer this node as an exit node for internet traffic of other devices."
                        checked={prefs.advertiseExitNode}
                        disabled={disabled}
                        onChange={checked => void apply({ advertiseExitNode: checked })} />

                    <FormGroup
                        label="Advertise subnet routes"
                        fieldId="ts-subnet-routes">
                        <TextInput
                            id="ts-subnet-routes-input"
                            value={routesValue}
                            placeholder="192.168.1.0/24"
                            validated={routesValid ? 'default' : 'error'}
                            isDisabled={disabled}
                            onChange={(_e, value) => setRoutesInput(value)} />
                        {!routesValid && (
                            <HelperText>
                                <HelperTextItem variant="error">Invalid CIDR notation</HelperTextItem>
                            </HelperText>
                        )}
                        <HelperText>
                            <HelperTextItem>
                                Comma-separated networks exposed to the tailnet, e.g. 10.0.0.0/8, 192.168.1.0/24.
                            </HelperTextItem>
                        </HelperText>
                        <Button
                            variant="secondary"
                            isDisabled={disabled || !dirtyRoutes || !routesValid}
                            isLoading={op.pending}
                            onClick={() => void apply({ subnetRoutes: parsedRoutes ?? [] })}>
                            Apply routes
                        </Button>
                    </FormGroup>

                    <FormGroup label="Hostname override" fieldId="ts-hostname">
                        <TextInput
                            id="ts-hostname-input"
                            value={hostnameValue}
                            placeholder="my-server"
                            validated={hostnameValid ? 'default' : 'error'}
                            isDisabled={disabled}
                            onChange={(_e, value) => setHostnameInput(value)} />
                        {!hostnameValid && (
                            <HelperText>
                                <HelperTextItem variant="error">
                                    Use letters, digits and hyphens only (max 63 chars)
                                </HelperTextItem>
                            </HelperText>
                        )}
                        <Button
                            variant="secondary"
                            isDisabled={disabled || !dirtyHostname}
                            isLoading={op.pending}
                            onClick={() => void apply({ hostname: hostnameValue })}>
                            Apply hostname
                        </Button>
                    </FormGroup>

                    <SwitchRow
                        id="ts-update-check"
                        label="Check for Tailscale updates"
                        checked={prefs.autoUpdateCheck}
                        disabled={disabled}
                        onChange={checked => void apply({ autoUpdateCheck: checked })} />

                    <SwitchRow
                        id="ts-auto-update"
                        label="Install Tailscale updates automatically"
                        checked={prefs.autoUpdateApply}
                        disabled={disabled}
                        onChange={checked => void apply({ autoUpdateApply: checked })} />

                    <Divider />

                    <SwitchRow
                        id="ts-ui-show-subnets"
                        label="Show subnet routes in peers table"
                        description="Browser-local preference: display the yellow Subnet badge for nodes that advertise extra networks. Exit node default routes (0.0.0.0/0, ::/0) are not counted."
                        checked={showSubnets}
                        disabled={false}
                        onChange={onShowSubnetsChange} />

                </Form>
        </>
    );
}

function exitNodeLabel(selectedIP: string, candidates: TailscalePeer[]): string {
    if (selectedIP === '')
        return 'No exit node';
    const match = candidates.find(p => p.TailscaleIPs.includes(selectedIP));
    return match ? match.HostName : selectedIP;
}
