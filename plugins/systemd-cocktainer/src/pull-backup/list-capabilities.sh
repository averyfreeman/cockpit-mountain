#!/bin/bash
# list-capabilities.sh <container-name>
#
# Only ever invoked by dispatch.sh (the name is already validated there,
# but re-checked here defensively since this script could in principle be
# run directly). Lists Linux file capabilities (what `setcap` sets) for
# files in the container's conventional system binary directories, so the
# vault can reapply them locally after its own plain `rsync -aH` pull.
#
# Why this exists instead of just adding -X/--xattrs to pull.sh's rsync:
# that was tried and reverted live (see pull.sh's changelog) - -X also
# tries to sync security.selinux along with the intended
# security.capability, and the vault's pull service (SELinux domain
# unconfined_service_t) can't write security.selinux without
# CAP_MAC_ADMIN, which broke every pull under SELinux Enforcing within
# minutes. This script sidesteps that entirely: `setcap` only ever touches
# security.capability, a completely different xattr governed by a
# different, much narrower permission (confirmed live: unconfined_service_t
# can set it directly with no SELinux complication at all).
#
# Restricted to conventional system binary dirs rather than the whole
# filesystem - setcap'd files are essentially always here in practice, and
# a full-tree `getcap -r /` scan is dramatically slower for no real benefit
# (confirmed live on a real container: ~28s full-tree vs ~0.2s restricted,
# identical result).
#
# Output: one "<path> <capability-string>" line per capability-bearing
# file found (getcap's own output format), paths relative to the container
# root. A container with no capability-bearing files just produces no
# output - a normal, supported case, not a failure.

set -euo pipefail

NAME_RE='^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$'
name="${1:-}"
[[ "$name" =~ $NAME_RE ]] || { echo "list-capabilities.sh: invalid container name: '$name'" >&2; exit 1; }

if ! machinectl show "$name" --property=State 2>/dev/null | grep -q '^State=running'; then
    echo "list-capabilities.sh: container '$name' is not running - cannot list capabilities" >&2
    exit 1
fi

SCAN_DIRS="/usr/bin /usr/sbin /usr/lib /usr/lib64 /usr/libexec /bin /sbin"

# getcap just skips (with a stderr note) any dir that doesn't exist on this
# particular container's image - no need to pre-filter the list ourselves.
# --pipe connects stdout so the capability list actually reaches here.
systemd-run --machine="$name" --pipe --wait --quiet -- \
    getcap -r $SCAN_DIRS 2>/dev/null

echo "list-capabilities.sh: scan complete for '$name'" >&2
