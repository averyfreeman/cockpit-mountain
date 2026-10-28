from pathlib import Path
import re

SUDOERS_DIR = Path("/etc/sudoers.d")
APP_BASE    = Path("/usr/share/cockpit/sudo-manager")

TEMPLATE = APP_BASE / "templates/user.sudoers.tpl"
ALIAS_OUT = SUDOERS_DIR / "00-cockpit-aliases"

COMMAND_SOURCES = [
    Path("/usr/share/cockpit/sudo-manager/sudo-commands.d"),
    Path("/etc/cockpit/sudo-manager/commands.local"),
]

ALIAS_HEADER = (
    "# Managed by Cockpit Sudo Manager\n"
    "# DO NOT EDIT BY HAND\n\n"
)

ALIAS_NAME_RE = re.compile(r"^[A-Z][A-Z0-9_]*$")
