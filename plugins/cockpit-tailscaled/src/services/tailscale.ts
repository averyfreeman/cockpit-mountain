/*
 * Service layer around the tailscale CLI.
 *
 * Security notes:
 *  - every command is spawned as an argument array, never through a shell,
 *    so user supplied values can not be interpreted by a shell;
 *  - user input (hostname, routes) is validated here before it is ever
 *    passed to the CLI.
 *
 * `tailscale set` requires tailscale >= 1.34 (2023); older clients are
 * detected and reported through isVersionSupported().
 */

import {
    ClientPrefs,
    ClientSettingsDelta,
    RawTailscalePrefs,
    TailscalePeer,
    TailscaleStatus,
    TailscaleVersion,
} from '../types';

/* Routes that mark "advertise as exit node"; they are managed with
 * --advertise-exit-node and must not be shown as subnet routes. */
export const EXIT_NODE_ROUTES = ['0.0.0.0/0', '::/0'];

const MIN_SUPPORTED: readonly [number, number] = [1, 34];

async function spawn(args: string[], options?: { superuser?: 'try' | 'require' }): Promise<string> {
    try {
        return await cockpit.spawn(args, { err: 'out', superuser: options?.superuser });
    } catch (exc) {
        const failure = exc as { message?: string; problem?: string };
        if (failure?.problem === 'not-found') {
            throw new Error("The tailscale command was not found on this system", { cause: exc });
        }
        throw new Error(failure?.message || failure?.problem || 'Unknown tailscale error', { cause: exc });
    }
}

export function parseJson<T>(output: string): T {
    return JSON.parse(output) as T;
}

export async function getVersion(): Promise<TailscaleVersion> {
    const out = await spawn(['tailscale', 'version', '--json']);
    return parseJson<TailscaleVersion>(out);
}

export async function getStatus(): Promise<TailscaleStatus> {
    const out = await spawn(['tailscale', 'status', '--json']);
    return parseJson<TailscaleStatus>(out);
}

export async function getPrefs(): Promise<RawTailscalePrefs> {
    const out = await spawn(['tailscale', 'debug', 'prefs']);
    return parseJson<RawTailscalePrefs>(out);
}

/* ------------------------------------------------------------------ */
/* Version helpers                                                     */
/* ------------------------------------------------------------------ */

export function parseVersion(version: string | null | undefined): [number, number, number] | null {
    if (!version)
        return null;
    const parts = version.split('.');
    if (parts.length < 2 || parts.some(p => !/^\d+$/.test(p)))
        return null;
    return [Number(parts[0]), Number(parts[1]), Number(parts[2] ?? 0)];
}

export function isVersionSupported(version: string | null | undefined): boolean {
    const parsed = parseVersion(version);
    if (!parsed)
        return false;
    const [major, minor] = parsed;
    if (major !== MIN_SUPPORTED[0])
        return major > MIN_SUPPORTED[0];
    return minor >= MIN_SUPPORTED[1];
}

/* ------------------------------------------------------------------ */
/* Mapping raw prefs to the normalized UI model                        */
/* ------------------------------------------------------------------ */

export function mapPrefs(raw: RawTailscalePrefs): ClientPrefs {
    const routes = raw.AdvertiseRoutes ?? [];
    return {
        wantRunning: raw.WantRunning ?? false,
        acceptDns: raw.CorpDNS ?? true,
        acceptRoutes: raw.RouteAll ?? false,
        sshEnabled: raw.RunSSH ?? false,
        shieldsUp: raw.ShieldsUp ?? false,
        advertiseExitNode: EXIT_NODE_ROUTES.every(r => routes.includes(r)),
        advertisedSubnetRoutes: routes.filter(r => !EXIT_NODE_ROUTES.includes(r)),
        hostnameOverride: raw.Hostname ?? '',
        exitNodeIP: raw.ExitNodeIP || raw.ExitNodeID || '',
        exitNodeAllowLanAccess: raw.ExitNodeAllowLANAccess ?? false,
        autoUpdateApply: raw.AutoUpdate?.Apply ?? false,
        autoUpdateCheck: raw.AutoUpdate?.Check ?? false,
    };
}

/* ------------------------------------------------------------------ */
/* Input validation                                                    */
/* ------------------------------------------------------------------ */

const CIDR4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(\/([0-9]|[12]\d|3[0-2]))?$/;
const CIDR6_RE = /^[0-9a-fA-F:]+(\/(12[0-8]|1[01]\d|[0-9]?\d))?$/;

function validIpv4(cidr: string): boolean {
    const m = CIDR4_RE.exec(cidr);
    if (!m)
        return false;
    return [1, 2, 3, 4].every(i => Number(m[i]) <= 255);
}

/** Returns the list of valid CIDR strings, or null when parsing fails. */
export function parseSubnetRoutes(input: string): string[] | null {
    const entries = input
            .split(/[,\s]+/)
            .map(s => s.trim())
            .filter(s => s.length > 0);
    if (entries.length === 0)
        return [];
    for (const entry of entries) {
        if (!(validIpv4(entry) || CIDR6_RE.test(entry)))
            return null;
    }
    return entries;
}

/* Hostname: RFC 1123 label, 1..63 characters */
const HOSTNAME_RE = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;

export function isValidHostname(name: string): boolean {
    return HOSTNAME_RE.test(name);
}

/* ------------------------------------------------------------------ */
/* Mutations                                                           */
/* ------------------------------------------------------------------ */

function setArgs(delta: ClientSettingsDelta): string[] {
    const args = ['tailscale', 'set'];

    if (delta.acceptDns !== undefined)
        args.push(`--accept-dns=${delta.acceptDns}`);
    if (delta.acceptRoutes !== undefined)
        args.push(`--accept-routes=${delta.acceptRoutes}`);
    if (delta.sshEnabled !== undefined)
        args.push(`--ssh=${delta.sshEnabled}`);
    if (delta.shieldsUp !== undefined)
        args.push(`--shields-up=${delta.shieldsUp}`);
    if (delta.advertiseExitNode !== undefined)
        args.push(`--advertise-exit-node=${delta.advertiseExitNode}`);
    if (delta.subnetRoutes !== undefined)
        args.push(`--advertise-routes=${delta.subnetRoutes.join(',')}`);
    if (delta.hostname !== undefined && delta.hostname !== '')
        args.push(`--hostname=${delta.hostname}`);
    if (delta.exitNodeIP === null)
        args.push('--exit-node=');
    else if (delta.exitNodeIP !== undefined)
        args.push(`--exit-node=${delta.exitNodeIP}`);
    if (delta.exitNodeAllowLanAccess !== undefined)
        args.push(`--exit-node-allow-lan-access=${delta.exitNodeAllowLanAccess}`);
    if (delta.autoUpdateApply !== undefined)
        args.push(`--auto-update=${delta.autoUpdateApply}`);
    if (delta.autoUpdateCheck !== undefined)
        args.push(`--update-check=${delta.autoUpdateCheck}`);

    return args;
}

/**
 * Apply settings changes atomically with one `tailscale set` invocation.
 * The caller is responsible for validating inputs.
 */
export async function applySettings(delta: ClientSettingsDelta): Promise<void> {
    const args = setArgs(delta);
    if (args.length === 2)
        return; // nothing to change
    await spawn(args, { superuser: 'require' });
}

/** Bring the tailnet connection up without altering any setting. */
export async function connect(): Promise<void> {
    await spawn(['tailscale', 'up'], { superuser: 'require' });
}

/** Disconnect from the tailnet without altering any setting. */
export async function disconnect(): Promise<void> {
    await spawn(['tailscale', 'down'], { superuser: 'require' });
}

/* ------------------------------------------------------------------ */
/* Peer helpers                                                        */
/* ------------------------------------------------------------------ */

export function isUsablePeer(peer: TailscalePeer): boolean {
    return !peer.ShareeNode;
}

/** Peers that can be selected as this node's exit node. */
export function exitNodeCandidates(peers: Record<string, TailscalePeer>): TailscalePeer[] {
    return Object.values(peers)
            .filter(p => p.ExitNodeOption && p.Online && !p.Self)
            .sort((a, b) => a.HostName.localeCompare(b.HostName));
}

/**
 * Subnet routes advertised by a peer: its AllowedIPs minus the
 * /32 and /128 entries for its own Tailscale addresses and minus
 * the default routes an exit node announces (0.0.0.0/0, ::/0).
 */
export function peerSubnetRoutes(peer: TailscalePeer): string[] {
    const own = new Set((peer.TailscaleIPs ?? []).flatMap(ip => [`${ip}/32`, `${ip}/128`]));
    return (peer.AllowedIPs ?? []).filter(cidr =>
        !own.has(cidr) && !EXIT_NODE_ROUTES.includes(cidr));
}

export function formatBytes(bytes: number | undefined): string {
    if (bytes === undefined || bytes < 0)
        return '-';
    const units = ['', 'KiB', 'MiB', 'GiB', 'TiB'];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit++;
    }
    const rounded = unit === 0 ? value : Math.round(value * 10) / 10;
    return `${rounded} ${units[unit]}`;
}

/** Split Tailscale addresses into their IPv4 and IPv6 representatives. */
export function splitTailscaleIps(ips: string[] | undefined): { ipv4?: string; ipv6?: string } {
    const all = ips ?? [];
    return {
        ipv4: all.find(ip => !ip.includes(':')),
        ipv6: all.find(ip => ip.includes(':')),
    };
}

/** Human readable duration, e.g. "23d 4h", "2h 15m" or "45s". */
export function formatDuration(ms: number): string {
    if (!Number.isFinite(ms) || ms < 0)
        return '-';
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0)
        return `${days}d ${hours}h`;
    if (hours > 0)
        return `${hours}h ${minutes}m`;
    if (minutes > 0)
        return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
}

/**
 * Describes the node key expiry: remaining time until it happens,
 * 'Expired' once passed, or 'Disabled' when the tailnet policy does
 * not use key expiry.
 */
export function keyExpiryText(expiry: string | null | undefined, now: Date = new Date()): string {
    if (expiry === null || expiry === undefined || expiry === '')
        return 'Disabled';
    const exp = new Date(expiry);
    const diffMs = exp.getTime() - now.getTime();
    if (Number.isNaN(diffMs))
        return '-';
    if (diffMs <= 0)
        return 'Expired';
    return `in ${formatDuration(diffMs)}`;
}

/**
 * Whole days until the node key expires, rounded up; negative once
 * expired. Returns null when expiry is disabled or unparsable.
 */
export function keyExpiryDays(expiry: string | null | undefined, now: Date = new Date()): number | null {
    if (expiry === null || expiry === undefined || expiry === '')
        return null;
    const diffMs = new Date(expiry).getTime() - now.getTime();
    if (Number.isNaN(diffMs))
        return null;
    return Math.ceil(diffMs / 86_400_000);
}
