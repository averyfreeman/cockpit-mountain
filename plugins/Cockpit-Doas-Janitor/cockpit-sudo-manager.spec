#
# spec file for package cockpit-sudo-manager
#
# Copyright (c) 2026 Joseph Oaks
#
# License: Apache-2.0
#

Name:           cockpit-sudo-manager
Version:        0.2.1
Release:        1%{?dist}
Summary:        Cockpit plugin for managing sudo rules safely

License:        Apache-2.0
URL:            https://github.com/josephoaks/Cockpit-SUDO-Manager
Source0:        cockpit-sudo-manager-%{version}.tar.gz

BuildArch:      noarch

Requires:       cockpit
Requires:       sudo
Requires:       python3

%description
Cockpit Sudo Manager is a Cockpit web UI plugin that provides
structured, policy-driven management of sudo rules without
direct manual editing of sudoers files.

It is designed to work across transactional and traditional
Linux distributions.

%prep
%autosetup -n cockpit-sudo-manager-%{version}

# Safety: ensure no build artifacts
find . -type d -name "__pycache__" -prune -exec rm -rf {} +

%install
mkdir -p %{buildroot}/usr/share/cockpit
cp -a sudo-manager %{buildroot}/usr/share/cockpit/

%files
%license LICENSE
%doc README.md
/usr/share/cockpit/sudo-manager

%changelog
* Tue Feb 03 2026 Joseph Oaks
- React + PatternFly UI changes

* Sat Jan 31 2026 Joseph Oaks
- Initial RPM packaging
