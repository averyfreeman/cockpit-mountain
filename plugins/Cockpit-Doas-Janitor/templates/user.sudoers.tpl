# Managed by Cockpit Sudo Manager (DO NOT EDIT BY HAND)
# User: {{USER}}
# Generated: {{DATE}}

########################################
# USER DEFAULTS
########################################
Defaults:{{USER}} env_reset
Defaults:{{USER}} secure_path="/usr/sbin:/usr/bin:/sbin:/bin"

########################################
# GUARDRAIL — neutralize vendor / inherited sudo
########################################
{{USER}} ALL=(ALL) !ALL

########################################
# EFFECTIVE PERMISSIONS (OVERWRITTEN)
########################################
{{RULE}}

