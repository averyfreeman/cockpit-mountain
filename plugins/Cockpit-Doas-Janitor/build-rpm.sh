#!/bin/bash
set -e

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")
echo "Building RPM for version ${VERSION}..."

# Clean Python cache files
find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
find . -type f -name "*.pyc" -delete 2>/dev/null || true

# Clean and build
npm run build

# Create tarball structure
TMPDIR=$(mktemp -d)
PKGDIR="${TMPDIR}/cockpit-sudo-manager-${VERSION}"
mkdir -p "${PKGDIR}/sudo-manager"

# Copy spec file to tarball root
cp cockpit-sudo-manager.spec "${PKGDIR}/"

# Copy runtime files only (not source)
cp -r dist/* "${PKGDIR}/sudo-manager/"
cp -r backend "${PKGDIR}/sudo-manager/"
cp -r sudo-commands.d "${PKGDIR}/sudo-manager/"
mkdir -p "${PKGDIR}/sudo-manager/templates"
cp templates/user.sudoers.tpl "${PKGDIR}/sudo-manager/templates/"
cp manifest.json "${PKGDIR}/sudo-manager/"
cp LICENSE "${PKGDIR}/sudo-manager/"
cp README.md "${PKGDIR}/sudo-manager/"

# Clean any __pycache__ that might have been copied
find "${PKGDIR}" -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
find "${PKGDIR}" -type f -name "*.pyc" -delete 2>/dev/null || true

# Create tarball
cd "${TMPDIR}"
tar czf "cockpit-sudo-manager-${VERSION}.tar.gz" "cockpit-sudo-manager-${VERSION}/"

# Move to current directory
mv "cockpit-sudo-manager-${VERSION}.tar.gz" "${OLDPWD}/"

# Cleanup
rm -rf "${TMPDIR}"

echo "Created cockpit-sudo-manager-${VERSION}.tar.gz"
echo ""
echo "To build RPM:"
echo "  cp cockpit-sudo-manager-${VERSION}.tar.gz ~/rpmbuild/SOURCES/"
echo "  rpmbuild -ba cockpit-sudo-manager.spec"
