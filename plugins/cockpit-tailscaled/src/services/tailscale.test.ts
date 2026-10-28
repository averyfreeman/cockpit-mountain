/*
 * Unit tests for the pure logic of the tailscale service layer.
 * Run with: npm run test:unit
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
    EXIT_NODE_ROUTES,
    formatBytes,
    formatDuration,
    isValidHostname,
    isVersionSupported,
    keyExpiryDays,
    keyExpiryText,
    mapPrefs,
    parseSubnetRoutes,
    parseVersion,
    peerSubnetRoutes,
    splitTailscaleIps,
} from './tailscale';
import { OS, TailscalePeer } from '../types';

/* ------------------------------------------------------------------ */

test('parseVersion parses valid versions', () => {
    assert.deepEqual(parseVersion('1.34.2'), [1, 34, 2]);
    assert.deepEqual(parseVersion('1.102.3'), [1, 102, 3]);
    assert.deepEqual(parseVersion('1.34'), [1, 34, 0]);
});

test('parseVersion rejects invalid input', () => {
    assert.equal(parseVersion(undefined), null);
    assert.equal(parseVersion(''), null);
    assert.equal(parseVersion('abc'), null);
    assert.equal(parseVersion('1.x.3'), null);
    assert.equal(parseVersion('-1.2.3'), null);
});

test('isVersionSupported enforces >= 1.34', () => {
    assert.equal(isVersionSupported('1.33.4'), false);
    assert.equal(isVersionSupported('1.34.0'), true);
    assert.equal(isVersionSupported('1.34'), true);
    assert.equal(isVersionSupported('1.102.3'), true);
    assert.equal(isVersionSupported('2.0.0'), true);
    assert.equal(isVersionSupported('0.99'), false);
    assert.equal(isVersionSupported(undefined), false);
    assert.equal(isVersionSupported(null), false);
});

/* ------------------------------------------------------------------ */

test('mapPrefs maps raw prefs to the UI model', () => {
    const prefs = mapPrefs({
        WantRunning: true,
        CorpDNS: true,
        RouteAll: true,
        RunSSH: true,
        ShieldsUp: false,
        ExitNodeIP: '100.64.0.1',
        ExitNodeAllowLANAccess: true,
        AdvertiseRoutes: [...EXIT_NODE_ROUTES, '10.0.0.0/8'],
        Hostname: 'myhost',
        AutoUpdate: { Check: true, Apply: false },
    });

    assert.deepEqual(prefs, {
        wantRunning: true,
        acceptDns: true,
        acceptRoutes: true,
        sshEnabled: true,
        shieldsUp: false,
        advertiseExitNode: true,
        advertisedSubnetRoutes: ['10.0.0.0/8'],
        hostnameOverride: 'myhost',
        exitNodeIP: '100.64.0.1',
        exitNodeAllowLanAccess: true,
        autoUpdateApply: false,
        autoUpdateCheck: true,
    });
});

test('mapPrefs applies safe defaults for missing fields', () => {
    const prefs = mapPrefs({});
    assert.equal(prefs.wantRunning, false);
    assert.equal(prefs.acceptDns, true); // CLI default
    assert.equal(prefs.acceptRoutes, false);
    assert.equal(prefs.sshEnabled, false);
    assert.equal(prefs.advertiseExitNode, false);
    assert.deepEqual(prefs.advertisedSubnetRoutes, []);
    assert.equal(prefs.exitNodeIP, '');
    assert.equal(prefs.autoUpdateCheck, false);
});

test('mapPrefs falls back to ExitNodeID when no IP', () => {
    const prefs = mapPrefs({ ExitNodeID: 'auto:any' });
    assert.equal(prefs.exitNodeIP, 'auto:any');
});

/* ------------------------------------------------------------------ */

test('parseSubnetRoutes accepts comma and whitespace separated CIDRs', () => {
    assert.deepEqual(parseSubnetRoutes('10.0.0.0/8'), ['10.0.0.0/8']);
    assert.deepEqual(
        parseSubnetRoutes('10.0.0.0/8, 192.168.1.0/24'),
        ['10.0.0.0/8', '192.168.1.0/24']);
    assert.deepEqual(
        parseSubnetRoutes('  fd7a::/48   ,10.1.2.3 '),
        ['fd7a::/48', '10.1.2.3']);
    /* bare IPs without prefix are allowed by the CLI */
    assert.deepEqual(parseSubnetRoutes('10.1.2.3'), ['10.1.2.3']);
});

test('parseSubnetRoutes returns [] for empty input', () => {
    assert.deepEqual(parseSubnetRoutes(''), []);
    assert.deepEqual(parseSubnetRoutes('   '), []);
});

test('parseSubnetRoutes rejects malformed routes', () => {
    assert.equal(parseSubnetRoutes('256.0.0.0/8'), null);
    assert.equal(parseSubnetRoutes('10.0.0.0/33'), null);
    assert.equal(parseSubnetRoutes('not-a-route'), null);
    assert.equal(parseSubnetRoutes('10.0.0.0/8;rm -rf /'), null);
});

/* ------------------------------------------------------------------ */

test('isValidHostname follows RFC 1123 label rules', () => {
    assert.equal(isValidHostname('server-01'), true);
    assert.equal(isValidHostname('a'), true);
    assert.equal(isValidHostname('-bad'), false);
    assert.equal(isValidHostname('bad-'), false);
    assert.equal(isValidHostname('with space'), false);
    assert.equal(isValidHostname('dot.ted'), false);
    assert.equal(isValidHostname('a'.repeat(64)), false);
    assert.equal(isValidHostname('a'.repeat(63)), true);
});

/* ------------------------------------------------------------------ */

test('formatBytes renders human readable sizes', () => {
    assert.equal(formatBytes(undefined), '-');
    assert.equal(formatBytes(-5), '-');
    assert.equal(formatBytes(0), '0 ');
    assert.equal(formatBytes(512), '512 ');
    assert.equal(formatBytes(2048), '2 KiB');
    assert.equal(formatBytes(1536), '1.5 KiB');
    assert.equal(formatBytes(1048576 * 3), '3 MiB');
});

/* ------------------------------------------------------------------ */

test('splitTailscaleIps separates IPv4 and IPv6 addresses', () => {
    const { ipv4, ipv6 } = splitTailscaleIps(['100.64.0.1', 'fd7a:115c:a1e0::1']);
    assert.equal(ipv4, '100.64.0.1');
    assert.equal(ipv6, 'fd7a:115c:a1e0::1');

    assert.deepEqual(splitTailscaleIps(['100.64.0.1']), { ipv4: '100.64.0.1', ipv6: undefined });
    assert.deepEqual(splitTailscaleIps([]), { ipv4: undefined, ipv6: undefined });
    assert.deepEqual(splitTailscaleIps(undefined), { ipv4: undefined, ipv6: undefined });
});

/* ------------------------------------------------------------------ */

test('formatDuration renders compact human readable durations', () => {
    assert.equal(formatDuration(-1), '-');
    assert.equal(formatDuration(Number.NaN), '-');
    assert.equal(formatDuration(45_000), '45s');
    assert.equal(formatDuration(5 * 60_000), '5m 0s');
    assert.equal(formatDuration(2 * 3600_000 + 15 * 60_000), '2h 15m');
    assert.equal(formatDuration(23 * 86400_000 + 4 * 3600_000), '23d 4h');
});

test('keyExpiryText describes remaining time, expiry or disabled state', () => {
    const now = new Date('2026-08-24T12:00:00Z');

    assert.equal(keyExpiryText(null, now), 'Disabled');
    assert.equal(keyExpiryText(undefined, now), 'Disabled');
    assert.equal(keyExpiryText('', now), 'Disabled');

    const inTwoDays = new Date(now.getTime() + 2 * 86400_000).toISOString();
    assert.match(keyExpiryText(inTwoDays, now), /^in 2d \d+h$/);

    const past = new Date(now.getTime() - 60_000).toISOString();
    assert.equal(keyExpiryText(past, now), 'Expired');

    assert.equal(keyExpiryText('not-a-date', now), '-');
});

/* ------------------------------------------------------------------ */

function fakePeer(overrides: Partial<TailscalePeer>): TailscalePeer {
    return {
        Self: false,
        ID: '1',
        PublicKey: 'key',
        HostName: 'host',
        DNSName: 'host.tailnet.ts.net',
        OS: OS.Linux,
        UserID: '1',
        TailscaleIPs: ['100.64.0.1', 'fd7a::1'],
        Relay: '',
        RxBytes: 0,
        TxBytes: 0,
        Created: new Date(),
        LastWrite: new Date(),
        LastSeen: new Date(),
        LastHandshake: new Date(),
        Online: true,
        KeepAlive: false,
        ExitNode: false,
        ExitNodeOption: false,
        Active: false,
        CurAddr: '',
        ...overrides,
    };
}

test('peerSubnetRoutes extracts advertised routes from AllowedIPs', () => {
    const peer = fakePeer({
        TailscaleIPs: ['100.64.0.1', 'fd7a:115c:a1e0::1'],
        AllowedIPs: [
            '100.64.0.1/32',
            'fd7a:115c:a1e0::1/128',
            '10.0.0.0/8',
            '192.168.1.0/24',
        ],
    });
    assert.deepEqual(peerSubnetRoutes(peer), ['10.0.0.0/8', '192.168.1.0/24']);
});

test('peerSubnetRoutes ignores exit-node default routes', () => {
    const peer = fakePeer({
        TailscaleIPs: ['100.64.0.2', 'fd7a:115c:a1e0::2'],
        AllowedIPs: [
            '100.64.0.2/32',
            'fd7a:115c:a1e0::2/128',
            ...EXIT_NODE_ROUTES,
            '172.16.0.0/12',
        ],
    });
    assert.deepEqual(peerSubnetRoutes(peer), ['172.16.0.0/12']);
});

test('peerSubnetRoutes returns [] for plain nodes and missing data', () => {
    assert.deepEqual(peerSubnetRoutes(fakePeer({})), []);
    const noIps = fakePeer({});
    delete (noIps as { AllowedIPs?: string[] }).AllowedIPs;
    assert.deepEqual(peerSubnetRoutes(noIps), []);
});

/* ------------------------------------------------------------------ */

test('keyExpiryDays counts whole days until expiry, rounded up', () => {
    const now = new Date('2026-08-24T12:00:00Z');
    assert.equal(keyExpiryDays(null, now), null);
    assert.equal(keyExpiryDays('', now), null);
    assert.equal(keyExpiryDays('not-a-date', now), null);
    /* 2.5 days -> rounds up to 3 */
    assert.equal(keyExpiryDays('2026-08-27T00:00:00Z', now), 3);
    /* exactly one day */
    assert.equal(keyExpiryDays('2026-08-25T12:00:00Z', now), 1);
    /* already expired -> negative */
    assert.equal(keyExpiryDays('2026-08-20T00:00:00Z', now), -4);
});
