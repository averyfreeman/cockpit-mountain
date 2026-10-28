/*
 * Type definitions for the tailscale CLI JSON interfaces.
 * BackendState: keep in sync with
 * https://github.com/tailscale/tailscale/blob/main/ipn/backend.go
 */

export type TailscaleBackendState =
    | 'NoState'
    | 'NeedsMachineAuth'
    | 'NeedsLogin'
    | 'InUseOtherUser'
    | 'Stopped'
    | 'Starting'
    | 'Running';

export interface TailscaleVersion {
    majorMinorPatch: string;
    short: string;
    long: string;
    gitCommit: string;
    extraGitCommit: string;
    cap: number;
}

export enum OS {
    Android = "android",
    IOS = "iOS",
    Linux = "linux",
    MACOS = "macOS",
    Windows = "windows",
}

export interface TailscalePeer {
    Self: boolean;
    ID: string;
    PublicKey: string;
    HostName: string;
    DNSName: string;
    OS: OS;
    UserID: string;
    TailscaleIPs: string[];
    Tags?: string[];
    Capabilities?: string[];
    Relay: string;
    RxBytes: number;
    TxBytes: number;
    Created: Date;
    LastWrite: Date;
    LastSeen: Date;
    LastHandshake: Date;
    Online: boolean;
    KeepAlive: boolean;
    ExitNode: boolean;
    ExitNodeOption: boolean;
    Active: boolean;
    CurAddr: string;
    ShareeNode?: boolean;
    /** RFC 3339 timestamp; absent/null when key expiry is disabled */
    KeyExpiry?: string | null;
    /** All IP ranges this peer is trusted for: its own addresses plus
     * any advertised subnet routes */
    AllowedIPs?: string[];
}

export interface TailscaleExitNodeStatus {
    ID: string;
    Online: boolean;
    TailscaleIPs: string[];
}

export interface TailscaleUser {
    ID: number;
    LoginName: string;
    DisplayName: string;
    ProfilePicURL: string;
    Roles: string[];
}

export interface TailscapeCurrentTailnet {
    Name: string;
    MagicDNSSuffix: string;
    MagicDNSEnabled: boolean;
}

export interface TailscaleStatus {
    Version?: string;
    BackendState: TailscaleBackendState;
    AuthURL: string;
    TailscaleIPs?: string[];
    Self: TailscalePeer;
    CurrentTailnet: TailscapeCurrentTailnet | null;
    ExitNodeStatus: TailscaleExitNodeStatus | null;
    User: Record<string, TailscaleUser> | null;
    Peer: Record<string, TailscalePeer> | null;
}

export type TailscaleUp = {
    BackendState: TailscaleBackendState;
    AuthURL?: string;
    QR?: string;
};

/*
 * Raw preferences as reported by `tailscale debug prefs`.
 * Only the subset this application manages is declared; unknown
 * fields are ignored on purpose so newer clients keep working.
 */
export interface RawTailscalePrefs {
    RouteAll?: boolean;
    ExitNodeID?: string;
    ExitNodeIP?: string;
    ExitNodeAllowLANAccess?: boolean;
    CorpDNS?: boolean;
    RunSSH?: boolean;
    RunWebClient?: boolean;
    WantRunning?: boolean;
    LoggedOut?: boolean;
    ShieldsUp?: boolean;
    AdvertiseTags?: string[] | null;
    Hostname?: string;
    AdvertiseRoutes?: string[] | null;
    AutoUpdate?: {
        Check?: boolean;
        Apply?: boolean;
    };
}

/* Normalized client configuration used by the UI */
export interface ClientPrefs {
    wantRunning: boolean;
    acceptDns: boolean;
    acceptRoutes: boolean;
    sshEnabled: boolean;
    shieldsUp: boolean;
    advertiseExitNode: boolean;
    advertisedSubnetRoutes: string[];
    hostnameOverride: string;
    exitNodeIP: string;
    exitNodeAllowLanAccess: boolean;
    autoUpdateApply: boolean;
    autoUpdateCheck: boolean;
}

/* Options accepted by `tailscale set`; undefined means "do not change" */
export interface ClientSettingsDelta {
    acceptDns?: boolean;
    acceptRoutes?: boolean;
    sshEnabled?: boolean;
    shieldsUp?: boolean;
    advertiseExitNode?: boolean;
    subnetRoutes?: string[];
    hostname?: string;
    exitNodeIP?: string | null; // null clears the exit node
    exitNodeAllowLanAccess?: boolean;
    autoUpdateApply?: boolean;
    autoUpdateCheck?: boolean;
}
