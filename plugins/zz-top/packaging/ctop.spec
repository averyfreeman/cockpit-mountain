Name:           cockpit-ctop
Version:        1.1.6
Release:        1%{?dist}
Summary:        btop-style system monitor for Cockpit
License:        Apache-2.0
BuildArch:      noarch
Requires:       cockpit-bridge >= 215

%description
A native Cockpit plugin that reproduces btop's resource-monitor UI:
CPU, memory/disk, network, and process boxes with gradient braille graphs.

%prep
# sources are provided out-of-tree; nothing to unpack

%install
mkdir -p %{buildroot}%{_datadir}/cockpit/ctop
cp -r %{_sourcedir}/ctop/manifest.json %{_sourcedir}/ctop/index.html \
      %{_sourcedir}/ctop/index.css %{_sourcedir}/ctop/src \
      %{buildroot}%{_datadir}/cockpit/ctop/

%files
%{_datadir}/cockpit/ctop

%changelog
* Sat Aug 09 2026 ismetozalp <ismetozalp@users.noreply.github.com> - 1.1.6-1
- Fix self-update never restarting Cockpit: the backgrounded restart was killed when the update stream channel closed, so the new version was installed but never took effect. Detach the restart via systemd-run so it survives.

* Sat Aug 09 2026 ismetozalp <ismetozalp@users.noreply.github.com> - 1.1.5-1
- Fix the box headers (mem, proc, ...) being clipped/unreadable at the top of the middle columns; the v1.1.4 release shipped before this fix landed

* Sat Jul 25 2026 ismetozalp <ismetozalp@users.noreply.github.com> - 1.1.4-1
- Align the middle-row columns: the left box stack now starts flush with the proc box (was 16px lower), and its last visible box grows so its bottom is flush with the proc box bottom when the stack fits

* Fri Jul 24 2026 ismetozalp <ismetozalp@users.noreply.github.com> - 1.1.3-1
- Fix the disk-I/O device label wrapping vertically (one character per line) in a narrow mem box
- Show the containers box (empty) whenever podman or docker is installed, even with no containers running

* Thu Jul 23 2026 ismetozalp <ismetozalp@users.noreply.github.com> - 1.1.2-1
- Fix the battery box missing its left/right/bottom borders (it never set a box color)

* Wed Jul 22 2026 ismetozalp <ismetozalp@users.noreply.github.com> - 1.1.1-1
- Fix containers box listing every container twice under the podman-docker shim (dedup by container ID)
- docker support + loop-device toggle

* Mon Jul 20 2026 ismetozalp <ismetozalp@users.noreply.github.com> - 1.0.0-1
- Initial 1.0.0 release
