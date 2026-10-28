#!/usr/bin/env python3
"""
sudo_aliases.py

Manages sudo aliases with STIG-compliant file handling.

Responsibilities:
- Compile command aliases from sudo-commands.d
- Manage user-created aliases (User_Alias, Runas_Alias, Host_Alias, Cmnd_Alias)
- Maintain atomic file operations with visudo validation
- Preserve STIG hardening (ownership, permissions, validation)
"""

import os
from pathlib import Path
from sudo_parser import parse_sudo_commands
from sudo_paths import (
    ALIAS_OUT, ALIAS_HEADER, ALIAS_NAME_RE
)
from sudo_validate import die, normalize, visudo_check

# ============================================================
# Alias Storage Structure
# ============================================================
# 
# /etc/sudoers.d/00-cockpit-aliases contains:
# 1. Auto-compiled Cmnd_Alias entries from sudo-commands.d (read-only to users)
# 2. User-managed aliases (User_Alias, Runas_Alias, Host_Alias, Cmnd_Alias)
#
# Format:
# # Managed by Cockpit Sudo Manager
# # DO NOT EDIT BY HAND
# #
# # AUTO-COMPILED COMMAND ALIASES
# Cmnd_Alias SYSTEMCTL_STATUS = /usr/bin/systemctl status
# ...
# #
# # USER-MANAGED ALIASES
# User_Alias ADMINS = user1, user2, %wheel
# Runas_Alias WEBUSERS = www-data, nginx
# Host_Alias WEBSERVERS = web1, web2, 192.168.1.0/24
# Cmnd_Alias CUSTOM_CMDS = /usr/local/bin/deploy.sh
#
# ============================================================

USER_ALIAS_MARKER = "# USER-MANAGED ALIASES"
AUTO_ALIAS_MARKER = "# AUTO-COMPILED COMMAND ALIASES"


def _parse_existing_user_aliases() -> dict:
    """
    Parse user-managed aliases from the alias file.
    Returns dict: { "User_Alias": {...}, "Runas_Alias": {...}, ... }
    """
    if not ALIAS_OUT.exists():
        return {
            "User_Alias": {},
            "Runas_Alias": {},
            "Host_Alias": {},
            "Cmnd_Alias": {},
        }
    
    content = ALIAS_OUT.read_text()
    lines = content.split("\n")
    
    # Find user-managed section
    in_user_section = False
    aliases = {
        "User_Alias": {},
        "Runas_Alias": {},
        "Host_Alias": {},
        "Cmnd_Alias": {},
    }
    
    for line in lines:
        line = line.strip()
        
        if USER_ALIAS_MARKER in line:
            in_user_section = True
            continue
        
        if not in_user_section or not line or line.startswith("#"):
            continue
        
        # Parse alias line: "Type NAME = member1, member2"
        for alias_type in aliases.keys():
            prefix = alias_type.replace("_", "_")  # User_Alias, etc.
            if line.startswith(prefix):
                try:
                    _, rest = line.split(prefix, 1)
                    name, members_str = rest.split("=", 1)
                    name = name.strip()
                    members = [m.strip() for m in members_str.split(",") if m.strip()]
                    aliases[alias_type][name] = members
                except ValueError:
                    # Malformed line, skip
                    continue
                break
    
    return aliases


# ============================================================
# Command Alias Compiler (AUTO-COMPILED FROM sudo-commands.d)
# ============================================================

def compile_aliases():
    """
    Compile command aliases from sudo-commands.d into the alias file.
    Preserves user-managed aliases while updating auto-compiled ones.
    
    This ensures STIG compliance by:
    - Validating all aliases with visudo
    - Setting secure ownership (root:root)
    - Setting secure permissions (0440)
    - Using atomic file replacement
    """
    catalog = parse_sudo_commands()
    
    # Build auto-compiled command aliases
    auto_lines = [AUTO_ALIAS_MARKER]
    for cat in catalog.values():
        for name, members in cat["command_aliases"].items():
            if not ALIAS_NAME_RE.match(name):
                die(f"Invalid alias name: {name}")
            if not members:
                continue
            auto_lines.append(
                f"Cmnd_Alias {name} = " +
                ", ".join(normalize(m) for m in members)
            )
    
    # Get existing user-managed aliases
    user_aliases = _parse_existing_user_aliases()
    
    # Build user-managed section
    user_lines = [USER_ALIAS_MARKER]
    for alias_type in ["User_Alias", "Runas_Alias", "Host_Alias", "Cmnd_Alias"]:
        for name, members in sorted(user_aliases[alias_type].items()):
            user_lines.append(
                f"{alias_type} {name} = " +
                ", ".join(normalize(m) for m in members)
            )
    
    # Combine everything
    lines = [
        ALIAS_HEADER.rstrip(),
        "#",
        *auto_lines,
        "#",
        *user_lines,
        ""
    ]
    
    content = "\n".join(lines)
    
    # Atomic write with STIG-compliant permissions
    tmp = ALIAS_OUT.with_suffix(".tmp")
    tmp.write_text(content)
    os.chown(tmp, 0, 0)
    os.chmod(tmp, 0o440)
    visudo_check(tmp)
    tmp.replace(ALIAS_OUT)


# ============================================================
# User Alias Management
# ============================================================

def add_alias(alias_type: str, name: str, members: list[str]):
    """
    Add or update a user-managed alias.
    
    Args:
        alias_type: One of "User_Alias", "Runas_Alias", "Host_Alias", "Cmnd_Alias"
        name: Alias name (must match [A-Z][A-Z0-9_]*)
        members: List of members for the alias
    
    STIG Compliance:
    - Validates alias name format
    - Ensures at least one member
    - Rebuilds entire file atomically
    - Validates with visudo
    """
    valid_types = ["User_Alias", "Runas_Alias", "Host_Alias", "Cmnd_Alias"]
    if alias_type not in valid_types:
        die(f"Invalid alias type: {alias_type}. Must be one of {valid_types}")
    
    if not ALIAS_NAME_RE.match(name):
        die(f"Invalid alias name: {name}. Must match [A-Z][A-Z0-9_]*")
    
    if not members:
        die(f"{alias_type} must have at least one member")
    
    # Load existing aliases
    aliases = _parse_existing_user_aliases()
    
    # Add/update the alias
    aliases[alias_type][name] = members
    
    # Rebuild the file
    _write_alias_file(aliases)


def delete_alias(alias_type: str, name: str):
    """
    Delete a user-managed alias.
    
    Args:
        alias_type: One of "User_Alias", "Runas_Alias", "Host_Alias", "Cmnd_Alias"
        name: Alias name to delete
    """
    valid_types = ["User_Alias", "Runas_Alias", "Host_Alias", "Cmnd_Alias"]
    if alias_type not in valid_types:
        die(f"Invalid alias type: {alias_type}")
    
    # Load existing aliases
    aliases = _parse_existing_user_aliases()
    
    # Remove the alias if it exists
    if name in aliases[alias_type]:
        del aliases[alias_type][name]
    
    # Rebuild the file
    _write_alias_file(aliases)


def list_user_aliases() -> dict:
    """
    Return all user-managed aliases.
    
    Returns:
        Dict with structure: { "User_Alias": {...}, "Runas_Alias": {...}, ... }
    """
    return _parse_existing_user_aliases()


def _write_alias_file(user_aliases: dict):
    """
    Internal: Write the complete alias file with both auto-compiled
    and user-managed aliases.
    
    STIG Compliance:
    - Atomic write operation
    - Root ownership
    - 0440 permissions
    - visudo validation
    """
    catalog = parse_sudo_commands()
    
    # Build auto-compiled command aliases
    auto_lines = [AUTO_ALIAS_MARKER]
    for cat in catalog.values():
        for name, members in cat["command_aliases"].items():
            if not ALIAS_NAME_RE.match(name):
                continue  # Skip invalid names silently
            if not members:
                continue
            auto_lines.append(
                f"Cmnd_Alias {name} = " +
                ", ".join(normalize(m) for m in members)
            )
    
    # Build user-managed section
    user_lines = [USER_ALIAS_MARKER]
    for alias_type in ["User_Alias", "Runas_Alias", "Host_Alias", "Cmnd_Alias"]:
        for name, members in sorted(user_aliases[alias_type].items()):
            user_lines.append(
                f"{alias_type} {name} = " +
                ", ".join(normalize(m) for m in members)
            )
    
    # Combine everything
    lines = [
        ALIAS_HEADER.rstrip(),
        "#",
        *auto_lines,
        "#",
        *user_lines,
        ""
    ]
    
    content = "\n".join(lines)
    
    # Atomic write with STIG-compliant permissions
    tmp = ALIAS_OUT.with_suffix(".tmp")
    tmp.write_text(content)
    os.chown(tmp, 0, 0)
    os.chmod(tmp, 0o440)
    visudo_check(tmp)
    tmp.replace(ALIAS_OUT)


# ============================================================
# Backward Compatibility (DEPRECATED)
# ============================================================

def write_user_alias(name: str, members: list[str]):
    """
    DEPRECATED: Use add_alias() instead.
    Kept for backward compatibility with old CLI interface.
    """
    add_alias("User_Alias", name, members)


# ============================================================
# Helpers
# ============================================================

def load_allowed_commands() -> set[str]:
    """
    Return set of all available command aliases from sudo-commands.d.
    Used for validation in other modules.
    """
    catalog = parse_sudo_commands()
    allowed = set()
    for cat in catalog.values():
        allowed.update(cat["command_aliases"].keys())
    return allowed
