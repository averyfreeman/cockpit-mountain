# Cockpit Sudo Manager

**STIG-compliant sudo rule management for Cockpit**

A Cockpit plugin for managing `sudo` policy in a structured, auditable, and policy-driven way. Cockpit Sudo Manager provides a UI-driven alternative to manually editing `/etc/sudoers` and `/etc/sudoers.d/*`, while still respecting native `sudo` behavior, ordering, and security expectations.

---

## Overview

Managing `sudo` safely at scale is hard:
- Manual edits are error-prone
- Syntax errors can lock out administrators
- Auditors want traceability
- Engineers want speed and clarity

**Cockpit Sudo Manager** bridges that gap by exposing controlled sudo management inside Cockpit, backed by standard sudoers files on disk.

The plugin is designed to:
- ✅ Easily manage `sudo`
- ✅ Keep everything compatible with existing tooling (`visudo`, config management, backups)
- ✅ Enforce STIG hardening by default
- ✅ Provide policy-based command catalogs

---

## Features

- ✅ **User & Group sudo rules** - Create and manage sudo permissions for users and groups
- ✅ **Command aliases** - Support for User_Alias, Runas_Alias, Host_Alias, and Cmnd_Alias
- ✅ **Policy-based security** - Pre-defined command catalogs with validation
- ✅ **Flexible command support** - Mix aliases with raw command paths
- ✅ **Advanced options** - NOPASSWD, NOEXEC, SETENV, LOG_INPUT, LOG_OUTPUT
- ✅ **STIG hardening** - Enforces security best practices (env_reset, secure_path, guardrails)
- ✅ **Modern UI** - React + PatternFly 6 with dark theme support
- ✅ **Safe operations** - Atomic file writes with visudo validation
- ✅ **Hover tooltips** - View command alias contents on hover
- ✅ **Custom commands** - Add one-off commands not in the catalog

---

## Requirements

- **Cockpit** >= 271
- **PatternFly** 6
- **Python** 3.11+
- **sudo** package
- **Node.js** >= 16 (for building from source)

---

## Current Tested Platforms

| Component | Status |
|-----------|--------|
| OS | **SUSE Linux Enterprise Server 16** |
| OS | **SLE Micro 6.x** |
| Cockpit | Native SLES packages |
| Sudo | Standard `sudo` |
| Packaging | RPM (manual install) |

> ⚠️ **Tested on:** SLES 16 & SLE Micro 6.x  

> ⛔ **Will NOT work on:** SLE Micro 5.x (limited Cockpit APIs and PatternFly 5)

---

## Installation

### From RPM (Recommended)
```bash
# Install the package
sudo rpm -ivh cockpit-sudo-manager-<ver>.noarch.rpm

# Restart Cockpit
sudo systemctl restart cockpit.socket
```

### Manual Installation (Current Method)

> Until packaging is finalized, manual installation is required.

#### Prerequisites
```bash
# Install Cockpit and sudo
sudo zypper install cockpit sudo

# Enable and start Cockpit
sudo systemctl enable --now cockpit.socket
```

#### Install Cockpit Sudo Manager
```bash
# Clone the repository
git clone https://github.com/josephoaks/Cockpit-SUDO-Manager.git
cd Cockpit-SUDO-Manager

# Install Node.js dependencies (if building from source)
npm install

# Build the frontend
npm run build

# Copy files to Cockpit directory
sudo mkdir -p /usr/share/cockpit/sudo-manager
sudo cp -r dist/* /usr/share/cockpit/sudo-manager/
sudo cp -r backend /usr/share/cockpit/sudo-manager/
sudo cp -r sudo-commands.d /usr/share/cockpit/sudo-manager/
sudo mkdir -p /usr/share/cockpit/sudo-manager/templates
sudo cp templates/user.sudoers.tpl /usr/share/cockpit/sudo-manager/templates/

# Set correct permissions
sudo chown -R root:root /usr/share/cockpit/sudo-manager
sudo chmod 755 /usr/share/cockpit/sudo-manager
sudo chmod 755 /usr/share/cockpit/sudo-manager/backend
sudo chmod 644 /usr/share/cockpit/sudo-manager/backend/*.py

# Restart Cockpit
sudo systemctl restart cockpit.socket
```

#### Access the Application

1. Open your browser to `https://<your-server>:9090`
2. Log in with your credentials
3. Navigate to **"Sudo Manager"** in the sidebar

---

## Current Capabilities

- ✅ View existing sudo rules from `/etc/sudoers.d/`
- ✅ Create user and group sudo rules
- ✅ Manage command aliases (User_Alias, Runas_Alias, Host_Alias, Cmnd_Alias)
- ✅ Edit existing rules with full option support
- ✅ Delete rules with confirmation
- ✅ Safe rule generation (no direct editing of `/etc/sudoers`)
- ✅ Cockpit-integrated dark theme UI
- ✅ Policy-driven command catalogs
- ✅ Custom command paths for flexibility
- ✅ STIG-compliant file generation
- ✅ Atomic file operations with visudo validation
- ✅ Preserves sudo file ordering and naming conventions

---

## Development

### Project Structure
```
cockpit-sudo-manager/
├── src/                          # React source code
│   ├── components/              # React components (forms, table, etc.)
│   │   ├── SudoUserForm.jsx    # User rule form
│   │   ├── SudoGroupForm.jsx   # Group rule form
│   │   └── SudoAliasForm.jsx   # Alias management form
│   ├── utils/                   # Helper utilities
│   │   ├── backend.js          # Backend communication
│   │   └── catalog.js          # Command catalog loading
│   ├── app.jsx                  # Main application component
│   ├── app.scss                 # Application styles
│   ├── index.tsx                # Entry point
│   └── manifest.json            # Cockpit manifest
├── backend/                      # Python backend (STIG-compliant)
│   ├── sudo-manager.py         # Main backend entrypoint
│   ├── sudo_rules.py           # Rule CRUD operations
│   ├── sudo_parser.py          # Policy-aware parsing
│   ├── sudo_aliases.py         # Alias management
│   ├── sudo_catalog.py         # Command catalog
│   ├── sudo_validate.py        # visudo validation
│   ├── sudo_paths.py           # Path configuration
│   └── sudo_templates.py       # Template rendering
├── sudo-commands.d/             # Command catalog definitions
│   ├── 00-aliases              # Command aliases
│   ├── 10-defaults             # Default commands
│   ├── 20-web                  # Web server commands
│   ├── 30-system-core          # Core system commands
│   ├── 31-system-network       # Network commands
│   ├── 32-system-observability # Monitoring commands
│   ├── 33-system-identity      # Identity management
│   └── 40-packages             # Package management
├── templates/
│   └── user.sudoers.tpl        # Sudoers file template with STIG hardening
└── build.js                     # Build script (esbuild)
```

### Setup Development Environment
```bash
# Clone the repository
git clone https://github.com/josephoaks/Cockpit-SUDO-Manager.git
cd Cockpit-SUDO-Manager

# Install dependencies
npm install
```

### Build
```bash
# Production build
npm run build

# Development watch mode
npm run watch
```

### Deploy to Local Cockpit (Development)
```bash
# Build and deploy
npm run build
sudo rsync -av --delete dist/ /usr/share/cockpit/sudo-manager/
sudo cp -r backend /usr/share/cockpit/sudo-manager/
sudo cp -r sudo-commands.d /usr/share/cockpit/sudo-manager/
sudo systemctl restart cockpit.socket
```

### Linting
```bash
# JavaScript/TypeScript linting
npm run eslint
npm run eslint:fix

# Style linting
npm run stylelint
npm run stylelint:fix
```

---

## Backend Architecture

All sudo rule management logic lives in Python to ensure STIG compliance and security:

### Key Modules

- **`sudo_rules.py`** - Core CRUD operations for user and group rules
  - Creates sudoers files with STIG-compliant templates
  - Validates commands against policy catalog
  - Atomic file operations with visudo validation
  - Supports both command aliases and raw command paths

- **`sudo_parser.py`** - Policy-aware parsing
  - Parses command catalogs from `sudo-commands.d/`
  - Classifies system groups for sudo eligibility
  - Enforces policy decisions (excludes system/daemon groups)

- **`sudo_aliases.py`** - Alias management
  - Manages User_Alias, Runas_Alias, Host_Alias, Cmnd_Alias
  - Compiles command aliases from catalog
  - Separates auto-compiled vs user-managed aliases

- **`sudo_validate.py`** - Validation
  - Runs visudo to validate syntax before deployment
  - Normalizes command formatting
  - Prevents invalid configurations

- **`sudo_templates.py`** - Template rendering
  - Applies STIG-compliant sudoers templates
  - Includes env_reset, secure_path
  - Adds guardrail rules to neutralize inherited permissions

### STIG Compliance Features

1. **Guardrail Rules** - Neutralizes vendor/inherited sudo with `!ALL` rules
2. **Environment Security** - Enforces `env_reset` and `secure_path`
3. **Policy Validation** - All commands validated against approved catalog
4. **Atomic Operations** - Temporary files with visudo check before replacement
5. **Secure Permissions** - All sudoers files created as root:root, mode 0440
6. **Audit Trail** - Timestamped headers in all generated files

---

## Command Catalog

Commands are organized in `sudo-commands.d/` by functional category:

- **`00-aliases`** - Command aliases (auto-compiled)
- **`05-policy`** - Policy constraints (not selectable in UI)
- **`10-defaults`** - Default sudo behaviors
- **`20-web`** - Web server operations (nginx, apache)
- **`30-system-core`** - Core system commands (systemctl, journalctl)
- **`31-system-network`** - Network operations (firewall, routing)
- **`32-system-observability`** - Monitoring and logging
- **`33-system-identity`** - User/group management
- **`40-packages`** - Package management (zypper, dnf, apt)

Custom commands can be added via the UI or by creating files in `/etc/cockpit/sudo-manager/commands.local`.

---

## Usage

1. **Access Cockpit** at `https://<your-server>:9090`
2. Navigate to **"Sudo Manager"** in the sidebar
3. Click **"Add"** to create new rules:
   - **Add Sudo User** - Grant sudo to a specific user
   - **Add Sudo Group** - Grant sudo to a group
   - **Add Sudo Alias** - Create reusable aliases
4. Use **Edit** (⋮ menu) to modify existing rules
5. Use **Delete** (⋮ menu) to remove rules (with confirmation)

### Tips

- **Hover over command aliases** (like `SYSTEMCTL_STATUS`) to see which commands they contain
- **Use custom commands** for one-off command paths not in the catalog
- **Mix aliases and raw paths** for maximum flexibility (e.g., `SYSTEMCTL_STATUS, /usr/local/bin/deploy.sh`)
- **Groups cannot use NOPASSWD** - this is enforced by STIG policy

---

## Security Considerations

- All operations require **superuser** privilege via Cockpit
- Backend runs with elevated privileges for sudoers file management
- All sudoers files are validated with `visudo` before deployment
- Invalid configurations are rejected and never written to disk
- Group rules cannot use NOPASSWD (STIG requirement)
- All generated files include guardrail rules to prevent accidental privilege escalation
- Environment variables are reset (`env_reset`) and PATH is restricted (`secure_path`)

---

## Building RPM Package
```bash
# Update version in package.json and cockpit-sudo-manager.spec

# Build frontend
npm run build

# Create tarball
tar czf cockpit-sudo-manager-0.1.tar.gz \
  --transform 's,^,cockpit-sudo-manager-0.1/sudo-manager/,' \
  dist/ backend/ sudo-commands.d/ templates/ LICENSE README.md manifest.json

# Build RPM
rpmbuild -tb cockpit-sudo-manager-0.1.tar.gz
```

---

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## Roadmap

- [ ] Finalize RPM packaging for SLES/openSUSE
- [ ] Add support for Red Hat Enterprise Linux
- [ ] Implement rule import/export functionality
- [ ] Add audit log viewer
- [ ] Support for editing existing aliases
- [ ] Integration tests with pytest

---

## License

Apache-2.0 - see [LICENSE](LICENSE) file for details

---

## Author

**Joseph Oaks**

- GitHub: [@josephoaks](https://github.com/josephoaks)
- Repository: [Cockpit-SUDO-Manager](https://github.com/josephoaks/Cockpit-SUDO-Manager)

---

## Acknowledgments

- Built with [Cockpit](https://cockpit-project.org/) framework
- UI powered by [PatternFly 6](https://www.patternfly.org/)
- Inspired by the need for safe, STIG-compliant sudo management on SUSE Linux Enterprise

---

**Need help?** [Open an issue](https://github.com/josephoaks/Cockpit-SUDO-Manager/issues)
