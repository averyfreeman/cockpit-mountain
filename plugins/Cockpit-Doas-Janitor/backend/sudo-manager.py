#!/usr/bin/env python3
"""
sudo-manager.py
Cockpit Sudo Manager backend entrypoint.
Responsibilities:
- CLI dispatch and argument validation
- Orchestrate policy operations
- Expose JSON-safe output to Cockpit frontend
All policy logic lives in dedicated modules.
"""
import sys
import json
from sudo_rules import (
    list_rules,
    update_rule,
    update_group,
    delete_rule,
    delete_group_rule,
)
from sudo_catalog import (
    catalog as command_catalog,
    group_catalog,
)
from sudo_aliases import add_alias, write_user_alias
from sudo_validate import die

# ---------------- Debug ----------------
print(f"[DEBUG] argv = {sys.argv}", file=sys.stderr)

# ============================================================
# CLI usage
# ============================================================
def usage():
    die(
        "Usage:\n"
        "  sudo-manager.py list\n"
        "  sudo-manager.py catalog\n"
        "  sudo-manager.py group-catalog\n"
        "  sudo-manager.py update <user> <runas> <passwd|nopasswd> <cmds|ALL>\n"
        "  sudo-manager.py update-group <group> <runas> <passwd> <cmds|ALL>\n"
        "  sudo-manager.py delete <user>\n"
        "  sudo-manager.py delete-group <group>\n"
        "  sudo-manager.py add-alias User_Alias <name> <members...>\n"
        "  sudo-manager.py update-json <json>\n"
        "  sudo-manager.py update-group-json <json>\n"
        "  sudo-manager.py delete-json <json>\n"
        "  sudo-manager.py delete-group-json <json>\n"
        "  sudo-manager.py add-alias-json <json>\n"
    )

# ============================================================
# Main dispatch
# ============================================================
if len(sys.argv) < 2:
    usage()

action = sys.argv[1]

try:
    if action == "list":
        list_rules()

    elif action == "catalog":
        print(json.dumps(command_catalog(), indent=2))

    elif action == "group-catalog":
        print(json.dumps(group_catalog(), indent=2))

    # ============================================================
    # Legacy CLI interface (preserved for backward compatibility)
    # ============================================================

    elif action == "update" and len(sys.argv) == 6:
        update_rule(
            user=sys.argv[2],
            runas=sys.argv[3],
            mode=sys.argv[4],
            cmds=sys.argv[5],
        )

    elif action == "update-group" and len(sys.argv) == 6:
        update_group(
            group=sys.argv[2],
            runas=sys.argv[3],
            mode=sys.argv[4],
            cmds=sys.argv[5],
        )

    elif action == "delete" and len(sys.argv) == 3:
        delete_rule(sys.argv[2])

    elif action == "delete-group" and len(sys.argv) == 3:
        delete_group_rule(sys.argv[2])

    elif action == "add-alias" and len(sys.argv) >= 5:
        alias_type = sys.argv[2]
        alias_name = sys.argv[3]
        members    = sys.argv[4:]
        if alias_type != "User_Alias":
            die(f"Unsupported alias type: {alias_type}")
        write_user_alias(alias_name, members)
        print(json.dumps({
            "status": "ok",
            "type": alias_type,
            "alias": alias_name,
            "members": members,
        }))

    # ============================================================
    # JSON interface (for React frontend)
    # ============================================================

    elif action == "update-json" and len(sys.argv) == 3:
        """
        Accept JSON payload from React frontend.
        Extracts fields and calls existing STIG-compliant update_rule().

        Expected JSON format:
        {
            "user": "username",
            "runas": "root",
            "all": false,
            "commands": ["CMD1", "CMD2"],
            "custom_commands": ["/path/to/custom"],
            "nopasswd": true,
            "noexec": false,
            "setenv": false,
            "log_input": false,
            "log_output": false
        }
        """
        data = json.loads(sys.argv[2])

        user = data.get("user")
        if not user:
            die("Missing required field: user")

        runas = data.get("runas", "root")
        mode = "nopasswd" if data.get("nopasswd") else "passwd"

        # Combine regular commands and custom commands
        if data.get("all"):
            cmds = "ALL"
        else:
            all_commands = data.get("commands", [])
            custom_commands = data.get("custom_commands", [])
            all_commands.extend(custom_commands)
            cmds = ",".join(all_commands) if all_commands else "ALL"

        # Extract all options for STIG-compliant rule generation
        options = {
            "nopasswd": data.get("nopasswd", False),
            "noexec": data.get("noexec", False),
            "setenv": data.get("setenv", False),
            "log_input": data.get("log_input", False),
            "log_output": data.get("log_output", False),
        }

        # Call existing STIG-compliant function with options
        update_rule(user, runas, mode, cmds, options)

        print(json.dumps({"status": "ok", "user": user}))

    elif action == "update-group-json" and len(sys.argv) == 3:
        """
        Accept JSON payload for group updates.
        Calls existing STIG-compliant update_group().
        
        Note: Groups are restricted from using NOPASSWD by STIG policy.
        """
        data = json.loads(sys.argv[2])

        group = data.get("group")
        if not group:
            die("Missing required field: group")

        runas = data.get("runas", "root")
        mode = "nopasswd" if data.get("nopasswd") else "passwd"

        if data.get("all"):
            cmds = "ALL"
        else:
            all_commands = data.get("commands", [])
            custom_commands = data.get("custom_commands", [])
            all_commands.extend(custom_commands)
            cmds = ",".join(all_commands) if all_commands else "ALL"

        # Extract options (note: nopasswd will be rejected by update_group for STIG compliance)
        options = {
            "nopasswd": data.get("nopasswd", False),
            "noexec": data.get("noexec", False),
            "setenv": data.get("setenv", False),
            "log_input": data.get("log_input", False),
            "log_output": data.get("log_output", False),
        }

        # Call existing STIG-compliant function with options
        update_group(group, runas, mode, cmds, options)

        print(json.dumps({"status": "ok", "group": group}))

    elif action == "delete-json" and len(sys.argv) == 3:
        """
        Accept JSON payload for delete operations.
        Calls existing delete_rule().
        """
        data = json.loads(sys.argv[2])
        user = data.get("user")
        if not user:
            die("Missing required field: user")

        # Call existing function
        delete_rule(user)

        print(json.dumps({"status": "ok", "deleted": user}))

    elif action == "delete-group-json" and len(sys.argv) == 3:
        """
        Accept JSON payload for group delete operations.
        Calls delete_group_rule().
        """
        data = json.loads(sys.argv[2])
        group = data.get("group")
        if not group:
            die("Missing required field: group")

        # Remove % prefix if present
        if group.startswith("%"):
            group = group[1:]

        # Call delete function
        delete_group_rule(group)

        print(json.dumps({"status": "ok", "deleted": group}))

    elif action == "add-alias-json" and len(sys.argv) == 3:
        """
        Accept JSON payload for alias creation.
        Calls new add_alias() function that supports all alias types.
        
        Expected JSON format:
        {
            "type": "User_Alias|Runas_Alias|Host_Alias|Cmnd_Alias",
            "name": "ALIAS_NAME",
            "members": ["member1", "member2", ...]
        }
        """
        data = json.loads(sys.argv[2])

        alias_type = data.get("type")
        alias_name = data.get("name")
        members = data.get("members", [])

        if not alias_type or not alias_name:
            die("Missing required fields: type, name")

        # Use new add_alias function (supports all types with STIG compliance)
        add_alias(alias_type, alias_name, members)

        print(json.dumps({
            "status": "ok",
            "type": alias_type,
            "alias": alias_name,
            "members": members,
        }))

    else:
        usage()

except Exception as e:
    die(str(e))
