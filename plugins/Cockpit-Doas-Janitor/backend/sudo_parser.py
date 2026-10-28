#!/usr/bin/env python3
"""
sudo_parser.py

Backend policy-aware parsing utilities for Cockpit Sudo Manager.

Responsibilities:
- Parse selectable sudo command aliases and raw commands
- Parse and classify selectable system groups for group-based sudo rules
- Enforce policy decisions here (NOT in UI or JS)
"""

import re
import subprocess
from pathlib import Path

# ============================================================
# Command / RunAs alias parsing
# ============================================================

CMD_ALIAS_RE = re.compile(r'^Cmnd_Alias\s+(\w+)\s*=\s*(.*)')
RUNAS_ALIAS_RE = re.compile(r'^Runas_Alias\s+(\w+)\s*=\s*(.*)')


def _normalize(cmd: str) -> str:
    """Normalize whitespace in sudo command definitions."""
    return re.sub(r"\s+", " ", cmd.strip())


def parse_sudo_commands(
    path: str = "/usr/share/cockpit/sudo-manager/sudo-commands.d"
) -> dict:
    """
    Parse sudo-commands.d into a menu-safe, policy-aware catalog.

    - Ignores comments, Defaults, empty lines
    - Ignores policy-only files (05-policy, *policy*)
    - Resolves line continuations
    - Normalizes commands
    - Returns ONLY selectable commands / aliases
    """

    catalog: dict[str, dict] = {}

    for file in sorted(Path(path).iterdir()):
        if not file.is_file():
            continue

        # Policy files are constraints, never menu options
        if "policy" in file.name:
            continue

        category = file.name
        catalog[category] = {
            "command_aliases": {},
            "runas_aliases": {},
            "raw_commands": [],
        }

        buffer = ""

        for line in file.read_text(errors="ignore").splitlines():
            line = line.strip()

            if not line or line.startswith("#"):
                continue

            # Defaults are policy, not commands
            if line.startswith("Defaults"):
                continue

            # Handle line continuations
            if line.endswith("\\"):
                buffer += line[:-1] + " "
                continue

            line = buffer + line
            buffer = ""

            if m := CMD_ALIAS_RE.match(line):
                name, rest = m.groups()
                catalog[category]["command_aliases"][name] = [
                    _normalize(c) for c in rest.split(",") if c.strip()
                ]
                continue

            if m := RUNAS_ALIAS_RE.match(line):
                name, rest = m.groups()
                catalog[category]["runas_aliases"][name] = [
                    r.strip() for r in rest.split(",") if r.strip()
                ]
                continue

            # Raw commands (allowed but uncommon)
            catalog[category]["raw_commands"].append(_normalize(line))

    return catalog


# ============================================================
# Group parsing + policy classification
# ============================================================

# Groups that are always allowed to appear if present
_ALWAYS_ALLOW_GROUPS = {
    "wheel", "admin", "sudo", "users",
}

# Groups that must NEVER be exposed as sudo principals
_EXCLUDED_GROUPS = {
    # Core system / daemon identities
    "daemon", "bin", "sys", "nobody", "nogroup", "mail", "maildrop",

    # systemd / IPC / policy services
    "messagebus", "polkitd", "systemd-journal", "systemd-coredump",
    "systemd-timesync",

    # Network / service daemons
    "postfix", "dnsmasq", "chrony", "sshd", "dirsrv", "tftp"

    # Hardware / kernel scoped groups
    "disk", "kmem", "kvm", "sgx", "tape", "audio", "video", "render",

    # Execution-context groups (not roles)
    "wwwrun", "www"
}

# Regex-based exclusion (prefixes / patterns)
_EXCLUDED_PREFIXES = (
    "systemd-",
)


def _iter_system_groups():
    """
    Yield (name, gid, members) for all system groups via getent.

    Uses getent to remain compatible with:
    - local files
    - LDAP
    - SSSD
    """
    out = subprocess.check_output(["getent", "group"], text=True)

    for line in out.splitlines():
        try:
            name, _, gid, members = line.split(":", 3)
            yield name, int(gid), members
        except ValueError:
            # Malformed entry; ignore silently
            continue


def _classify_group_domain(name: str) -> str:
    """
    Determine the default policy domain for a group.

    This maps directly to sudoers.d files:
      - system  -> 10-groups-system
      - network -> 20-groups-network
      - web     -> 30-groups-web
    """

    lname = name.lower()

    if re.search(r"(net|network|vpn|firewall)", lname):
        return "network"

    if re.search(r"(www|web|http|nginx|apache)", lname):
        return "web"

    return "system"


def parse_sudo_groups() -> dict:
    """
    Parse and classify system groups into policy domains.

    Returns ONLY groups that are safe, role-oriented sudo principals.
    All unusable groups are silently excluded.

    Return format:
    {
        "system": [
            {"name": "wheel", "gid": 496},
            {"name": "users", "gid": 100},
        ],
        "network": [],
        "web": [],
    }
    """

    result = {
        "system": [],
        "network": [],
        "web": [],
    }

    for name, gid, members in _iter_system_groups():

        # ----------------------------------------------------
        # Hard exclusions (never visible)
        # ----------------------------------------------------

        # Human/user groups
        if gid >= 1000:
            continue

        # Prefix-based exclusions
        if name.startswith(_EXCLUDED_PREFIXES):
            continue

        # Explicit exclusions
        if name in _EXCLUDED_GROUPS:
            continue

        # ----------------------------------------------------
        # Allowlist override
        # ----------------------------------------------------
        if name in _ALWAYS_ALLOW_GROUPS:
            domain = _classify_group_domain(name)
            result[domain].append({
                "name": name,
                "gid": gid,
            })
            continue

        # ----------------------------------------------------
        # Heuristic: require role plausibility
        # ----------------------------------------------------

        # Groups with no members and no known admin role
        # are assumed to be implementation details
        if not members:
            continue

        domain = _classify_group_domain(name)

        result[domain].append({
            "name": name,
            "gid": gid,
        })

    # Stable ordering for UI
    for domain in result:
        result[domain].sort(key=lambda g: g["name"])

    return result
