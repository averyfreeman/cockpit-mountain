#!/usr/bin/env python3
"""
sudo_rules.py

Core rule management with STIG-compliant file operations.

Responsibilities:
- List active sudo rules
- Create/update user rules
- Create/update group rules
- Delete rules
- Enforce policy compliance
"""

import os
import re
import json
from pathlib import Path

from sudo_aliases import compile_aliases, load_allowed_commands
from sudo_parser import parse_sudo_commands
from sudo_templates import render_template
from sudo_validate import die, normalize, visudo_check
from sudo_paths import SUDOERS_DIR

# ============================================================
# Rule parsing
# ============================================================

SUDO_RE = re.compile(
    r"^(?P<user>\S+)\s+ALL=\((?P<runas>[^)]+)\)\s+"
    r"(?P<options>(?:[A-Z_,]+:)?)\s*(?P<cmds>.+)$"
)

# ============================================================
# Helpers
# ============================================================

def render_sudo_options(opts: dict) -> str:
    """
    Convert structured options into sudoers option prefix.

    Args:
        opts: Dict with boolean flags for each option

    Returns:
        Comma-separated option string (e.g., "NOPASSWD,NOEXEC")
    """
    mapping = {
        "nopasswd": "NOPASSWD",
        "noexec": "NOEXEC",
        "setenv": "SETENV",
        "log_input": "LOG_INPUT",
        "log_output": "LOG_OUTPUT",
    }

    enabled = [
        mapping[k]
        for k, v in opts.items()
        if v and k in mapping
    ]

    return ",".join(enabled)


def parse_sudo_options(opts_raw: str) -> dict:
    """
    Parse sudoers option prefix into structured dict.

    Args:
        opts_raw: Raw option string (e.g., "NOPASSWD,NOEXEC:")

    Returns:
        Dict with boolean flags
    """
    return {
        "nopasswd": "NOPASSWD" in opts_raw,
        "noexec": "NOEXEC" in opts_raw,
        "setenv": "SETENV" in opts_raw,
        "log_input": "LOG_INPUT" in opts_raw,
        "log_output": "LOG_OUTPUT" in opts_raw,
    }


# ============================================================
# List rules
# ============================================================

def list_rules():
    """
    List all active sudo rules from /etc/sudoers.d with alias expansion.

    Returns JSON array of rule objects.
    Each rule contains: user, runas, nopasswd, all, commands

    Commands can be either:
    - Strings (raw commands)
    - Objects with {name, commands} (aliases with tooltip data)

    STIG Compliance:
    - Ignores guardrail rules (!ALL)
    - Only shows effective permissions
    """
    rules = []

    # Load catalog for alias lookup (for tooltips)
    catalog = parse_sudo_commands()
    alias_lookup = {}
    for cat in catalog.values():
        for alias_name, alias_commands in cat["command_aliases"].items():
            alias_lookup[alias_name] = alias_commands

    for f in sorted(SUDOERS_DIR.iterdir()):
        if not f.is_file():
            continue

        # Skip system files
        if f.name.startswith("00-") or f.name.startswith("05-"):
            continue

        try:
            text = f.read_text(errors="ignore")
        except Exception:
            continue

        effective_match = None

        for line in text.splitlines():
            line = line.strip()

            if not line or line.startswith("#"):
                continue

            m = SUDO_RE.match(line)
            if not m:
                continue

            cmds = m.group("cmds").strip()

            # Skip guardrail / neutralization rules
            if cmds == "!ALL":
                continue

            effective_match = m

        if not effective_match:
            continue

        opts_raw = effective_match.group("options") or ""
        opts = parse_sudo_options(opts_raw)

        cmds = effective_match.group("cmds").strip()

        # Parse commands - expand aliases for tooltips
        cmd_list = []
        if cmds != "ALL":
            for c in cmds.split(","):
                c = normalize(c)
                # Check if it's an alias
                if c in alias_lookup:
                    cmd_list.append({
                        "name": c,
                        "commands": alias_lookup[c]
                    })
                else:
                    cmd_list.append(c)

        rules.append({
            "user": effective_match.group("user"),
            "runas": (
                "root"
                if effective_match.group("runas") == "ALL"
                else effective_match.group("runas")
            ),
            "nopasswd": opts["nopasswd"],  # Flattened for React
            "noexec": opts["noexec"],
            "setenv": opts["setenv"],
            "log_input": opts["log_input"],
            "log_output": opts["log_output"],
            "all": cmds == "ALL",
            "commands": cmd_list,
        })

    print(json.dumps(rules))


# ============================================================
# Update user rule
# ============================================================

def update_rule(user: str, runas: str, mode: str, cmds: str, options: dict = None):
    """
    Create or update a user sudo rule.

    Args:
        user: Username
        runas: Run-as user (e.g., "root", "ALL")
        mode: "passwd" or "nopasswd" (legacy CLI)
        cmds: Comma-separated commands (aliases OR full paths) or "ALL"
        options: Optional dict with noexec, setenv, log_input, log_output

    STIG Compliance:
    - Validates aliases against catalog
    - Allows full command paths (must start with /)
    - Allows mixing aliases and raw commands
    - Uses template with guardrails
    - Atomic file operations
    - visudo validation
    - Secure ownership and permissions
    """

    compile_aliases()

    allowed = load_allowed_commands()
    target = SUDOERS_DIR / user
    tmp = target.with_suffix(".tmp")

    # Merge legacy mode with new options
    if options is None:
        options = {}

    options.setdefault("nopasswd", mode == "nopasswd")
    options.setdefault("noexec", False)
    options.setdefault("setenv", False)
    options.setdefault("log_input", False)
    options.setdefault("log_output", False)

    opt_str = render_sudo_options(options)
    opt_prefix = f"{opt_str}:" if opt_str else ""

    if cmds == "ALL":
        rule_line = f"{user} ALL=({runas}) {opt_prefix}ALL"
    else:
        requested = [normalize(c) for c in cmds.split(",") if c.strip()]

        # Validate commands: allow aliases OR full command paths
        for c in requested:
            # Allow if it's:
            # 1. An alias from the catalog
            # 2. A full path starting with /
            # 3. A command with arguments (first part starts with /)
            is_alias = c in allowed
            cmd_base = c.split()[0] if " " in c else c
            is_full_path = cmd_base.startswith("/")
            
            if not is_alias and not is_full_path:
                die(f"Command not allowed: {c} (must be an alias from catalog or full path starting with /)")

        rule_line = (
            f"{user} ALL=({runas}) {opt_prefix}"
            + ", ".join(requested)
        )

    content = render_template(user, rule_line) + "\n"

    tmp.write_text(content)
    os.chown(tmp, 0, 0)
    os.chmod(tmp, 0o440)

    visudo_check(tmp)
    tmp.replace(target)


# ============================================================
# Update group rule
# ============================================================

def update_group(group: str, runas: str, mode: str, cmds: str, options: dict = None):
    """
    Create or update a group sudo rule.

    Args:
        group: Group name (without % prefix)
        runas: Run-as user
        mode: "passwd" or "nopasswd"
        cmds: Comma-separated commands (aliases OR full paths) or "ALL"
        options: Optional dict with noexec, setenv, log_input, log_output

    STIG Compliance:
    - Groups MUST use passwords (NOPASSWD restricted by policy)
    - Validates aliases against catalog
    - Allows full command paths (must start with /)
    - Allows mixing aliases and raw commands
    - Uses dedicated group file
    - Replaces existing group rule (no duplicates)
    """

    compile_aliases()

    allowed = load_allowed_commands()
    target = SUDOERS_DIR / f"10-group-{group}"
    tmp = target.with_suffix(".tmp")

    # Policy: groups must use passwords
    if mode == "nopasswd":
        die("NOPASSWD not permitted for group rules (STIG requirement)")

    # Merge options
    if options is None:
        options = {}

    options.setdefault("nopasswd", False)  # Force False for groups
    options.setdefault("noexec", False)
    options.setdefault("setenv", False)
    options.setdefault("log_input", False)
    options.setdefault("log_output", False)

    opt_str = render_sudo_options(options)
    opt_prefix = f"{opt_str}:" if opt_str else ""

    if cmds == "ALL":
        rule_line = f"%{group} ALL=({runas}) {opt_prefix}ALL"
    else:
        requested = [normalize(c) for c in cmds.split(",") if c.strip()]

        # Validate commands: allow aliases OR full command paths
        for c in requested:
            is_alias = c in allowed
            cmd_base = c.split()[0] if " " in c else c
            is_full_path = cmd_base.startswith("/")
            
            if not is_alias and not is_full_path:
                die(f"Command not allowed: {c} (must be an alias from catalog or full path starting with /)")

        rule_line = (
            f"%{group} ALL=({runas}) {opt_prefix}"
            + ", ".join(requested)
        )

    # Write with header
    content = (
        "# Managed by Cockpit Sudo Manager\n"
        "# DO NOT EDIT BY HAND\n\n"
        f"{rule_line}\n"
    )

    tmp.write_text(content)
    os.chown(tmp, 0, 0)
    os.chmod(tmp, 0o440)

    visudo_check(tmp)
    tmp.replace(target)


# ============================================================
# Delete rule
# ============================================================

def delete_rule(user: str):
    """
    Delete a user sudo rule.

    Args:
        user: Username (filename in /etc/sudoers.d)

    STIG Compliance:
    - Simple file deletion (no validation needed)
    """
    f = SUDOERS_DIR / user
    if f.exists():
        f.unlink()


def delete_group_rule(group: str):
    """
    Delete a group sudo rule.

    Args:
        group: Group name (without % prefix)

    STIG Compliance:
    - Simple file deletion (no validation needed)
    """
    f = SUDOERS_DIR / f"10-group-{group}"
    if f.exists():
        f.unlink()
