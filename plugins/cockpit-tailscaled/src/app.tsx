import React, { useState } from 'react';

import {
    Alert,
    Button,
    Modal,
    ModalVariant,
    Page,
    PageSection,
    Spinner,
    Stack,
    StackItem,
    Text,
    TextContent,
    TextVariants,
} from '@patternfly/react-core';
import CogIcon from '@patternfly/react-icons/dist/esm/icons/cog-icon';

import { PeersTable } from './components/peers-table';
import { SettingsForm } from './components/settings-form';
import { StatusPanel } from './components/status-panel';
import { useLocalPreference } from './hooks/useLocalPreference';
import { useSuperuser } from './hooks/useSuperuser';
import { useTailscaleData } from './hooks/useTailscaleData';

export function Application(): React.JSX.Element {
    const { status, prefs, version, versionSupported, loading, error, refresh } = useTailscaleData();
    const superuserAllowed = useSuperuser();
    const [configOpen, setConfigOpen] = useState(false);
    const [showSubnets, setShowSubnets] = useLocalPreference('tailscale.showSubnets', true);

    /* Mutations need superuser rights and a tailscale client that
     * understands `tailscale set` (>= 1.34). */
    const canOperate = superuserAllowed === true && versionSupported;
    const ready = status !== null && prefs !== null;

    return (
        <Page>
            <PageSection>
                <Stack hasGutter>

                <StackItem>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <TextContent>
                            <Text component={TextVariants.h1}>Tailscale</Text>
                            <Text component={TextVariants.p}>
                                Mesh VPN status of this machine.
                                {version && ` Client version: ${version}.`}
                            </Text>
                        </TextContent>
                        <Button
                            variant="plain"
                            aria-label="Configure Tailscale"
                            title="Configure Tailscale"
                            icon={<CogIcon />}
                            isDisabled={!ready}
                            onClick={() => setConfigOpen(true)} />
                    </div>
                </StackItem>

                {error &&
                    <StackItem>
                        <Alert
                            variant="danger"
                            title="Failed to communicate with tailscaled"
                            actionLinks={
                                <Button variant="link" onClick={() => void refresh()}>
                                    Retry
                                </Button>}>
                            {error}
                        </Alert>
                    </StackItem>}

                {!error && version !== null && !versionSupported &&
                    <StackItem>
                        <Alert variant="warning" title="Unsupported Tailscale version">
                            This interface requires Tailscale 1.34 or newer;
                            found {version ?? 'unknown'}. Please upgrade the client.
                        </Alert>
                    </StackItem>}

                {superuserAllowed === false &&
                    <StackItem>
                        <Alert variant="info" title="Limited mode">
                            Administrative privileges are not active; settings are read-only.
                            Use the privilege elevation button in the Cockpit shell to enable changes.
                        </Alert>
                    </StackItem>}

                {loading && status === null && !error &&
                    <StackItem>
                        <div className="pf-v5-u-text-align-center">
                            <Spinner size="xl" aria-label="Loading Tailscale status" />
                        </div>
                    </StackItem>}

                {ready &&
                    <StackItem>
                        <StatusPanel
                            status={status}
                            prefs={prefs}
                            canOperate={canOperate}
                            onRefresh={refresh} />
                    </StackItem>}

                {ready &&
                    <StackItem>
                        <PeersTable
                            self={status.Self}
                            peers={status.Peer}
                            selfSshEnabled={prefs.sshEnabled}
                            showSubnets={showSubnets} />
                    </StackItem>}

                </Stack>
            </PageSection>

            {ready && (
                <Modal
                    variant={ModalVariant.medium}
                    title="Tailscale configuration"
                    description="Changes are applied immediately with 'tailscale set'."
                    isOpen={configOpen}
                    onClose={() => setConfigOpen(false)}>
                    <SettingsForm
                        prefs={prefs}
                        peers={status.Peer}
                        canOperate={canOperate}
                        onRefresh={refresh}
                        showSubnets={showSubnets}
                        onShowSubnetsChange={setShowSubnets} />
                    <div style={{ textAlign: 'right', marginTop: '1rem' }}>
                        <Button variant="secondary" onClick={() => setConfigOpen(false)}>
                            Close
                        </Button>
                    </div>
                </Modal>
            )}
        </Page>
    );
}
